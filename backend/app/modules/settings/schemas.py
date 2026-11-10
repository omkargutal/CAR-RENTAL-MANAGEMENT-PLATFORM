from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.common.schemas import BaseSchema


class PricingSettings(BaseModel):
    rate_multiplier: float = Field(default=1.0, ge=0.5, le=5.0)
    category_deposits: Dict[str, int] = Field(
        default_factory=lambda: {
            "LUXURY": 500,
            "SUV": 300,
            "VAN": 300,
            "TRUCK": 300,
            "SEDAN": 200,
            "DEFAULT": 200,
        }
    )


class CancellationPolicySettings(BaseModel):
    free_cancellation_hours: int = Field(default=24, ge=0, le=168)
    fee_percentage_after_deadline: float = Field(default=20.0, ge=0.0, le=100.0)
    policy_text: str = Field(
        default="Free cancellation up to 24 hours prior to scheduled pickup. Late cancellations are subject to a 20% administrative fee."
    )


class PromoCode(BaseModel):
    code: str
    discount_percent: float = Field(..., ge=1.0, le=100.0)
    description: Optional[str] = None


class TaxAndDiscountsSettings(BaseModel):
    tax_rate_percent: float = Field(default=10.0, ge=0.0, le=50.0)
    active_promo_codes: List[PromoCode] = Field(
        default_factory=lambda: [
            PromoCode(code="SAVE10", discount_percent=10.0, description="10% off entire booking"),
            PromoCode(code="WELCOME10", discount_percent=10.0, description="New customer welcome offer"),
        ]
    )


class BusinessContactSettings(BaseModel):
    company_name: str = Field(default="Swaraj Tours & Travel")
    support_email: str = Field(default="support@swarajtours.com")
    phone: str = Field(default="+91 8421081570")
    address: str = Field(default="Swaraj Tours & Travel Hub, BKC Bandra East, Mumbai 400051")
    support_hours: str = Field(default="24/7 Concierge Support")


class BusinessSettingsData(BaseSchema):
    pricing: PricingSettings
    cancellation_policy: CancellationPolicySettings
    tax_and_discounts: TaxAndDiscountsSettings
    contact_info: BusinessContactSettings
    turnaround_buffer_minutes: int = Field(default=60, ge=0, le=720)


class BusinessSettingsUpdate(BaseModel):
    pricing: Optional[PricingSettings] = None
    cancellation_policy: Optional[CancellationPolicySettings] = None
    tax_and_discounts: Optional[TaxAndDiscountsSettings] = None
    contact_info: Optional[BusinessContactSettings] = None
    turnaround_buffer_minutes: Optional[int] = Field(None, ge=0, le=720)
