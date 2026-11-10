from decimal import Decimal
from typing import Dict, List, Optional
from app.common.schemas import BaseSchema


class FleetUtilizationKpi(BaseSchema):
    total_vehicles: int
    available_vehicles: int
    rented_vehicles: int
    maintenance_vehicles: int
    utilization_rate_percentage: float


class BookingBreakdownKpi(BaseSchema):
    total_bookings: int
    pending_bookings: int
    awaiting_payment_bookings: int
    confirmed_bookings: int
    active_bookings: int
    completed_bookings: int
    cancelled_bookings: int
    rejected_bookings: int
    refund_pending_bookings: int
    refunded_bookings: int


class RevenueSummaryKpi(BaseSchema):
    total_revenue: Decimal
    monthly_revenue: Decimal
    total_bookings: int
    average_booking_value: Decimal
    currency: str = "INR"


class PopularVehicleKpi(BaseSchema):
    vehicle_id: str
    make: str
    model: str
    category: str
    booking_count: int
    total_revenue: Decimal
    daily_rate: Decimal


class TimeSeriesDataPoint(BaseSchema):
    period: str
    revenue: Decimal
    bookings_count: int


class PlatformExecutiveOverview(BaseSchema):
    fleet: FleetUtilizationKpi
    revenue: RevenueSummaryKpi
    bookings: BookingBreakdownKpi
    popular_vehicles: List[PopularVehicleKpi]
    total_customers: int
    total_locations: int


class ReportAnalyticsResponse(BaseSchema):
    overview: PlatformExecutiveOverview
    revenue_chart: List[TimeSeriesDataPoint]
    status_distribution: Dict[str, int]
