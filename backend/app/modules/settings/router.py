from fastapi import APIRouter, Depends, Request
from app.common.schemas import ResponseEnvelope
from app.modules.auth.dependencies import extract_client_info, require_admin
from app.modules.settings.dependencies import get_settings_service
from app.modules.settings.schemas import BusinessSettingsData, BusinessSettingsUpdate
from app.modules.settings.service import BusinessSettingsService
from app.modules.users.models import User

router = APIRouter(prefix="/settings", tags=["Business Settings"])


@router.get("", response_model=ResponseEnvelope[BusinessSettingsData])
async def get_business_settings(
    service: BusinessSettingsService = Depends(get_settings_service),
):
    """Retrieve current operational business settings (pricing, deposits, policies, tax, contact)."""
    settings = await service.get_settings()
    return ResponseEnvelope(data=settings)


@router.patch("", response_model=ResponseEnvelope[BusinessSettingsData])
async def update_business_settings(
    payload: BusinessSettingsUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    service: BusinessSettingsService = Depends(get_settings_service),
):
    """
    Administrative mutation of business settings (pricing multipliers, deposits, cancellation policy, taxes, promo codes).
    Validates admin role on backend and writes to audit logs.
    """
    ip_address, _ = extract_client_info(request)
    updated = await service.update_settings(
        payload=payload,
        actor_id=current_user.id,
        ip_address=ip_address,
    )
    return ResponseEnvelope(data=updated, message="Business settings updated successfully.")
