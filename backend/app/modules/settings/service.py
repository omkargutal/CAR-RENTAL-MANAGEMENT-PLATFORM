from typing import Any, Dict, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.settings.models import BusinessSetting
from app.modules.settings.schemas import BusinessSettingsData, BusinessSettingsUpdate
from app.modules.users.repository import AuditLogRepository


DEFAULT_SETTINGS_DATA = {
    "pricing": {
        "rate_multiplier": 1.0,
        "category_deposits": {
            "LUXURY": 500,
            "SUV": 300,
            "VAN": 300,
            "TRUCK": 300,
            "SEDAN": 200,
            "DEFAULT": 200,
        },
    },
    "cancellation_policy": {
        "free_cancellation_hours": 24,
        "fee_percentage_after_deadline": 20.0,
        "policy_text": "Free cancellation up to 24 hours prior to scheduled pickup. Late cancellations are subject to a 20% administrative fee.",
    },
    "tax_and_discounts": {
        "tax_rate_percent": 10.0,
        "active_promo_codes": [
            {"code": "SAVE10", "discount_percent": 10.0, "description": "10% off entire booking"},
            {"code": "WELCOME10", "discount_percent": 10.0, "description": "New customer welcome offer"},
        ],
    },
    "contact_info": {
        "company_name": "Swaraj Tours & Travel",
        "support_email": "support@swarajtours.com",
        "phone": "+91 8421081570",
        "address": "Swaraj Tours & Travel Hub, BKC Bandra East, Mumbai 400051",
        "support_hours": "24/7 Concierge Support",
    },
    "turnaround_buffer_minutes": 60,
}


class BusinessSettingsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit_repo = AuditLogRepository(db)

    async def get_settings(self) -> BusinessSettingsData:
        stmt = select(BusinessSetting).where(BusinessSetting.key == "general")
        res = await self.db.execute(stmt)
        record = res.scalar_one_or_none()

        if not record:
            record = BusinessSetting(key="general", data=DEFAULT_SETTINGS_DATA)
            self.db.add(record)
            await self.db.commit()
            await self.db.refresh(record)

        return BusinessSettingsData.model_validate(record.data)

    async def update_settings(
        self,
        payload: BusinessSettingsUpdate,
        actor_id: Optional[uuid.UUID] = None,
        ip_address: Optional[str] = None,
    ) -> BusinessSettingsData:
        stmt = select(BusinessSetting).where(BusinessSetting.key == "general")
        res = await self.db.execute(stmt)
        record = res.scalar_one_or_none()

        if not record:
            current_dict = dict(DEFAULT_SETTINGS_DATA)
            record = BusinessSetting(key="general", data=current_dict)
            self.db.add(record)
        else:
            current_dict = dict(record.data)

        updates_applied = {}

        if payload.pricing is not None:
            current_dict["pricing"] = payload.pricing.model_dump()
            updates_applied["pricing"] = current_dict["pricing"]

        if payload.cancellation_policy is not None:
            current_dict["cancellation_policy"] = payload.cancellation_policy.model_dump()
            updates_applied["cancellation_policy"] = current_dict["cancellation_policy"]

        if payload.tax_and_discounts is not None:
            current_dict["tax_and_discounts"] = payload.tax_and_discounts.model_dump()
            updates_applied["tax_and_discounts"] = current_dict["tax_and_discounts"]

        if payload.contact_info is not None:
            current_dict["contact_info"] = payload.contact_info.model_dump()
            updates_applied["contact_info"] = current_dict["contact_info"]

        if payload.turnaround_buffer_minutes is not None:
            current_dict["turnaround_buffer_minutes"] = payload.turnaround_buffer_minutes
            updates_applied["turnaround_buffer_minutes"] = current_dict["turnaround_buffer_minutes"]

        record.data = current_dict
        await self.db.commit()
        await self.db.refresh(record)

        # Audit log sensitive business settings mutations
        if actor_id:
            await self.audit_repo.log_action(
                actor_id=actor_id,
                action="settings.updated",
                target_type="business_settings",
                target_id="general",
                details={"updated_fields": list(updates_applied.keys()), "changes": updates_applied},
                ip_address=ip_address,
            )

        return BusinessSettingsData.model_validate(record.data)
