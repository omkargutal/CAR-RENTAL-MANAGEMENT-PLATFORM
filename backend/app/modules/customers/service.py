from typing import List, Optional
import uuid
from sqlalchemy import select
from app.common.services import BaseService
from app.core.exceptions import ConflictError
from app.modules.bookings.models import Booking
from app.modules.customers.models import Customer
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.schemas import CustomerCreate, CustomerUpdate, CustomerVerificationUpdate
from app.modules.users.repository import AuditLogRepository


class CustomerService(BaseService[Customer]):
    def __init__(self, repository: CustomerRepository):
        super().__init__(repository)
        self.customer_repo = repository
        self.audit_repo = AuditLogRepository(repository.db)

    async def get_by_user_id(self, user_id: uuid.UUID) -> Optional[Customer]:
        return await self.customer_repo.get_by_user_id(user_id)

    async def create_customer(self, payload: CustomerCreate) -> Customer:
        existing_user_cust = await self.customer_repo.get_by_user_id(payload.user_id)
        if existing_user_cust:
            raise ConflictError("A customer profile already exists for this user.")

        existing_license = await self.customer_repo.get_by_license(
            payload.driver_license_number
        )
        if existing_license:
            raise ConflictError("Driver license number is already registered.")

        customer = Customer(
            user_id=payload.user_id,
            driver_license_number=payload.driver_license_number,
            driver_license_expiry=payload.driver_license_expiry,
            driver_license_country=payload.driver_license_country,
            date_of_birth=payload.date_of_birth,
            is_identity_verified=payload.is_identity_verified,
            notes=payload.notes,
        )
        return await self.customer_repo.create(customer)

    async def update_customer(
        self, customer_id: uuid.UUID, payload: CustomerUpdate
    ) -> Customer:
        customer = await self.get_or_404(customer_id)
        for key, val in payload.model_dump(exclude_unset=True).items():
            setattr(customer, key, val)
        return await self.customer_repo.update(customer)

    async def verify_identity(
        self,
        customer_id: uuid.UUID,
        payload: CustomerVerificationUpdate,
        actor_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None,
    ) -> Customer:
        customer = await self.get_or_404(customer_id)
        old_status = customer.is_identity_verified
        customer.is_identity_verified = payload.is_identity_verified
        if payload.verification_notes:
            customer.notes = (
                f"{customer.notes}\n[Verification Note]: {payload.verification_notes}".strip()
                if customer.notes
                else f"[Verification Note]: {payload.verification_notes}"
            )
        updated = await self.customer_repo.update(customer)

        if actor_id:
            await self.audit_repo.log_action(
                actor_id=actor_id,
                action="customer.identity_verification_updated",
                target_type="customer",
                target_id=str(customer_id),
                details={
                    "old_verified": old_status,
                    "new_verified": payload.is_identity_verified,
                    "notes": payload.verification_notes,
                },
                ip_address=ip_address,
            )

        return updated

    async def get_customer_bookings(self, customer_id: uuid.UUID) -> List[Booking]:
        customer = await self.get_or_404(customer_id)
        stmt = (
            select(Booking)
            .where(
                (Booking.customer_id == customer.id) | (Booking.customer_email == (customer.user.email if customer.user else None)),
                Booking.is_deleted == False,
            )
            .order_by(Booking.created_at.desc())
        )
        res = await self.customer_repo.db.execute(stmt)
        return list(res.scalars().all())
