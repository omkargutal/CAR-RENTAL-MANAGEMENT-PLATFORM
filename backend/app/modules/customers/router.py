from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, Request, status
from app.common.schemas import ResponseEnvelope
from app.modules.auth.dependencies import extract_client_info, get_current_user, require_staff_or_admin
from app.modules.bookings.router import serialize_booking
from app.modules.bookings.schemas import BookingRead
from app.modules.customers.dependencies import get_customer_service
from app.modules.customers.schemas import (
    CustomerCreate,
    CustomerDetailRead,
    CustomerRead,
    CustomerUpdate,
    CustomerVerificationUpdate,
)
from app.modules.customers.service import CustomerService
from app.modules.users.models import User

router = APIRouter(prefix="/customers", tags=["Customer Management"])


@router.get("", response_model=ResponseEnvelope[List[CustomerRead]])
async def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_staff_or_admin),
    service: CustomerService = Depends(get_customer_service),
):
    """
    Administrative listing of registered customers with linked user profiles and verification status.
    Protected by backend RBAC.
    """
    customers = await service.list(skip=skip, limit=limit)
    return ResponseEnvelope(data=[CustomerRead.model_validate(c) for c in customers])


@router.post("", response_model=ResponseEnvelope[CustomerRead], status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreate,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(get_customer_service),
):
    """Create customer profile linked to the authenticated user account."""
    if current_user.role.value == "CUSTOMER" and current_user.id != payload.user_id:
        payload.user_id = current_user.id
    customer = await service.create_customer(payload)
    return ResponseEnvelope(data=CustomerRead.model_validate(customer))


@router.get("/{customer_id}", response_model=ResponseEnvelope[CustomerDetailRead])
async def get_customer(
    customer_id: uuid.UUID,
    current_user: User = Depends(require_staff_or_admin),
    service: CustomerService = Depends(get_customer_service),
):
    """View comprehensive customer profile with linked user details and booking history."""
    customer = await service.get_or_404(customer_id)
    bookings = await service.get_customer_bookings(customer_id)
    serialized_bookings = [serialize_booking(b) for b in bookings]
    data = CustomerDetailRead.model_validate(customer)
    data.bookings = serialized_bookings
    return ResponseEnvelope(data=data)


@router.patch("/{customer_id}/verify", response_model=ResponseEnvelope[CustomerRead])
async def verify_customer_identity(
    customer_id: uuid.UUID,
    payload: CustomerVerificationUpdate,
    request: Request,
    current_user: User = Depends(require_staff_or_admin),
    service: CustomerService = Depends(get_customer_service),
):
    """
    Administrative document & identity verification management.
    Tracks reviewer and audit log on the backend.
    """
    ip_address, _ = extract_client_info(request)
    customer = await service.verify_identity(
        customer_id=customer_id,
        payload=payload,
        actor_id=current_user.id,
        ip_address=ip_address,
    )
    return ResponseEnvelope(
        data=CustomerRead.model_validate(customer),
        message=f"Customer identity verification set to {payload.is_identity_verified}.",
    )


@router.get("/{customer_id}/bookings", response_model=ResponseEnvelope[List[BookingRead]])
async def get_customer_bookings(
    customer_id: uuid.UUID,
    current_user: User = Depends(require_staff_or_admin),
    service: CustomerService = Depends(get_customer_service),
):
    """View full booking and rental history for a specific customer."""
    bookings = await service.get_customer_bookings(customer_id)
    return ResponseEnvelope(data=[serialize_booking(b) for b in bookings])


@router.patch("/{customer_id}", response_model=ResponseEnvelope[CustomerRead])
async def update_customer(
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
    current_user: User = Depends(require_staff_or_admin),
    service: CustomerService = Depends(get_customer_service),
):
    customer = await service.update_customer(customer_id, payload)
    return ResponseEnvelope(data=CustomerRead.model_validate(customer))
