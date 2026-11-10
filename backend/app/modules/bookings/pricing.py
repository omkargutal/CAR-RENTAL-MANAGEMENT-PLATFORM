import math
from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid
from pydantic import BaseModel
from app.modules.vehicles.models import Vehicle


class PricingBreakdown(BaseModel):
    currency: str = "INR"
    duration_days: int
    duration_hours: float
    daily_rate_cents: int
    daily_rate: Decimal
    base_amount_cents: int
    base_amount: Decimal
    location_fee_cents: int
    location_fee: Decimal
    tax_amount_cents: int
    tax_amount: Decimal
    discount_amount_cents: int
    discount_amount: Decimal
    deposit_amount_cents: int
    deposit_amount: Decimal
    total_amount_cents: int
    total_amount: Decimal
    is_one_way: bool
    estimated_km: Optional[int] = None
    rate_per_km: Optional[int] = None


class PricingEngine:
    TAX_RATE = Decimal("0.00")  # 0% tax per user requirement (GST & surcharges removed)
    ONE_WAY_FEE_CENTS = 0       # No relocation charge for cab booking

    @classmethod
    def get_vehicle_rate_per_km(cls, vehicle: Vehicle) -> int:
        if vehicle.specs and isinstance(vehicle.specs, dict) and "per_km_rate" in vehicle.specs:
            try:
                val = int(vehicle.specs["per_km_rate"])
                if val > 0:
                    return val
            except Exception:
                pass
        text = f"{vehicle.make} {vehicle.model}".lower()
        if "aura" in text or "dzire" in text:
            return 14
        if "ertiga" in text:
            return 16
        if "tavera" in text:
            return 18
        if "innova" in text and "crysta" not in text:
            return 18
        if "crysta" in text or "scorpio" in text or "thar" in text:
            return 22
        if "traveller" in text:
            return 30
        if "coach" in text or "bus" in text:
            return 45
        return 14

    @classmethod
    def get_vehicle_min_km(cls, vehicle: Vehicle) -> int:
        if vehicle.specs and isinstance(vehicle.specs, dict):
            if "outstation_min_km" in vehicle.specs:
                try:
                    val = int(vehicle.specs["outstation_min_km"])
                    if val > 0:
                        return val
                except Exception:
                    pass
            if "min_km_per_day" in vehicle.specs:
                try:
                    val = int(vehicle.specs["min_km_per_day"])
                    if val > 0:
                        return val
                except Exception:
                    pass
        text = f"{vehicle.make} {vehicle.model}".lower()
        if "aura" in text or "dzire" in text:
            return 150
        if "ertiga" in text or "innova" in text:
            return 200
        return 250

    @classmethod
    def calculate_rental_days(cls, start: datetime, end: datetime) -> tuple[int, float]:
        """Calculates billing days and total hours using a half-open boundary policy [start, end)."""
        delta = end - start
        total_hours = max(0.0, delta.total_seconds() / 3600.0)
        days = math.ceil(delta.total_seconds() / 86400.0)
        days = max(1, days)
        return days, round(total_hours, 2)

    @classmethod
    def calculate_charges(
        cls,
        vehicle: Vehicle,
        start: datetime,
        end: datetime,
        pickup_location_id: uuid.UUID,
        return_location_id: uuid.UUID,
        promo_code: Optional[str] = None,
        estimated_km: Optional[int] = None,
    ) -> PricingBreakdown:
        days, total_hours = cls.calculate_rental_days(start, end)

        # Fare calculation: km * fair price
        rate_per_km = cls.get_vehicle_rate_per_km(vehicle)
        km = estimated_km if (estimated_km and estimated_km > 0) else cls.get_vehicle_min_km(vehicle)

        base_amount_val = Decimal(km * rate_per_km)
        base_amount_cents = int(round(base_amount_val * 100))

        # Location charges: 0
        is_one_way = False
        location_fee_cents = 0

        # Promo code discount
        discount_amount_cents = 0
        if promo_code:
            code = promo_code.strip().upper()
            if code in ("SAVE10", "WELCOME10"):
                discount_amount_cents = int(round(base_amount_cents * 0.10))
            elif code == "WEEKLY20" and days >= 7:
                discount_amount_cents = int(round(base_amount_cents * 0.20))

        # Taxes: 0%
        tax_amount_cents = 0

        # Security deposit: 0 (no deposit concept for cab services)
        deposit_amount_cents = 0

        # Total amount: base - discount
        total_amount_cents = max(0, base_amount_cents - discount_amount_cents)

        return PricingBreakdown(
            currency="INR",
            duration_days=days,
            duration_hours=total_hours,
            daily_rate_cents=int(round(rate_per_km * 100)),
            daily_rate=Decimal(rate_per_km),
            base_amount_cents=base_amount_cents,
            base_amount=Decimal(base_amount_cents) / Decimal(100),
            location_fee_cents=location_fee_cents,
            location_fee=Decimal(0),
            tax_amount_cents=tax_amount_cents,
            tax_amount=Decimal(0),
            discount_amount_cents=discount_amount_cents,
            discount_amount=Decimal(discount_amount_cents) / Decimal(100),
            deposit_amount_cents=deposit_amount_cents,
            deposit_amount=Decimal(0),
            total_amount_cents=total_amount_cents,
            total_amount=Decimal(total_amount_cents) / Decimal(100),
            is_one_way=is_one_way,
            estimated_km=km,
            rate_per_km=rate_per_km,
        )
