import csv
from datetime import datetime, timezone
from decimal import Decimal
import io
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.bookings.models import Booking, BookingStatus
from app.modules.customers.models import Customer
from app.modules.locations.models import Location
from app.modules.reports.schemas import (
    BookingBreakdownKpi,
    FleetUtilizationKpi,
    PlatformExecutiveOverview,
    PopularVehicleKpi,
    ReportAnalyticsResponse,
    RevenueSummaryKpi,
    TimeSeriesDataPoint,
)
from app.modules.vehicles.models import Vehicle, VehicleStatus


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_overview(self) -> PlatformExecutiveOverview:
        # 1. Fleet stats
        stmt_vehicles = (
            select(Vehicle.status, func.count())
            .where(Vehicle.is_deleted == False)
            .group_by(Vehicle.status)
        )
        res_v = await self.db.execute(stmt_vehicles)
        fleet_counts = dict(res_v.all())

        total_v = sum(fleet_counts.values()) or 0
        available = fleet_counts.get(VehicleStatus.AVAILABLE, 0)
        rented = fleet_counts.get(VehicleStatus.RENTED, 0)
        maintenance = fleet_counts.get(VehicleStatus.MAINTENANCE, 0)
        utilization = (rented / total_v * 100) if total_v > 0 else 0.0

        fleet_kpi = FleetUtilizationKpi(
            total_vehicles=total_v,
            available_vehicles=available,
            rented_vehicles=rented,
            maintenance_vehicles=maintenance,
            utilization_rate_percentage=round(utilization, 2),
        )

        # 2. Booking status breakdown
        stmt_bookings = (
            select(Booking.status, func.count())
            .where(Booking.is_deleted == False)
            .group_by(Booking.status)
        )
        res_b = await self.db.execute(stmt_bookings)
        status_counts = dict(res_b.all())

        pending_cnt = status_counts.get(BookingStatus.PENDING, 0)
        awaiting_payment_cnt = status_counts.get(BookingStatus.AWAITING_PAYMENT, 0)
        confirmed_cnt = status_counts.get(BookingStatus.CONFIRMED, 0)
        active_cnt = status_counts.get(BookingStatus.ACTIVE, 0)
        completed_cnt = status_counts.get(BookingStatus.COMPLETED, 0)
        cancelled_cnt = status_counts.get(BookingStatus.CANCELLED, 0)
        rejected_cnt = status_counts.get(BookingStatus.REJECTED, 0)
        refund_pending_cnt = status_counts.get(BookingStatus.REFUND_PENDING, 0)
        refunded_cnt = status_counts.get(BookingStatus.REFUNDED, 0)
        total_bookings = sum(status_counts.values()) or 0

        booking_kpi = BookingBreakdownKpi(
            total_bookings=total_bookings,
            pending_bookings=pending_cnt,
            awaiting_payment_bookings=awaiting_payment_cnt,
            confirmed_bookings=confirmed_cnt,
            active_bookings=active_cnt,
            completed_bookings=completed_cnt,
            cancelled_bookings=cancelled_cnt,
            rejected_bookings=rejected_cnt,
            refund_pending_bookings=refund_pending_cnt,
            refunded_bookings=refunded_cnt,
        )

        # 3. Revenue stats
        # Total revenue excluding cancelled and rejected
        valid_statuses = [
            BookingStatus.CONFIRMED,
            BookingStatus.ACTIVE,
            BookingStatus.COMPLETED,
            BookingStatus.AWAITING_PAYMENT,
        ]
        stmt_rev = select(
            func.coalesce(func.sum(Booking.total_amount), 0),
            func.count(Booking.id),
        ).where(
            Booking.is_deleted == False,
            Booking.status.in_(valid_statuses),
        )
        res_rev = await self.db.execute(stmt_rev)
        sum_rev, rev_count = res_rev.one()
        sum_rev = Decimal(str(sum_rev))
        avg_val = (sum_rev / Decimal(rev_count)) if rev_count > 0 else Decimal("0.00")

        # Current calendar month revenue
        now = datetime.now(timezone.utc)
        current_month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        stmt_m_rev = select(func.coalesce(func.sum(Booking.total_amount), 0)).where(
            Booking.is_deleted == False,
            Booking.status.in_(valid_statuses),
            Booking.created_at >= current_month_start,
        )
        res_m_rev = await self.db.execute(stmt_m_rev)
        monthly_rev = Decimal(str(res_m_rev.scalar_one() or 0))

        revenue_kpi = RevenueSummaryKpi(
            total_revenue=sum_rev,
            monthly_revenue=monthly_rev,
            total_bookings=total_bookings,
            average_booking_value=round(avg_val, 2),
            currency="INR",
        )

        # 4. Popular Vehicles
        stmt_popular = (
            select(
                Booking.vehicle_id,
                func.count(Booking.id).label("booking_count"),
                func.coalesce(func.sum(Booking.total_amount), 0).label("vehicle_revenue"),
            )
            .where(Booking.is_deleted == False)
            .group_by(Booking.vehicle_id)
            .order_by(desc("booking_count"))
            .limit(5)
        )
        res_popular = await self.db.execute(stmt_popular)
        popular_rows = res_popular.all()

        popular_vehicles: List[PopularVehicleKpi] = []
        for vid, b_cnt, v_rev in popular_rows:
            v_stmt = select(Vehicle).where(Vehicle.id == vid)
            v_res = await self.db.execute(v_stmt)
            vehicle_obj = v_res.scalar_one_or_none()
            if vehicle_obj:
                popular_vehicles.append(
                    PopularVehicleKpi(
                        vehicle_id=str(vehicle_obj.id),
                        make=vehicle_obj.make,
                        model=vehicle_obj.model,
                        category=vehicle_obj.category.value if hasattr(vehicle_obj.category, "value") else str(vehicle_obj.category),
                        booking_count=b_cnt,
                        total_revenue=Decimal(str(v_rev)),
                        daily_rate=vehicle_obj.daily_rate,
                    )
                )

        # 5. Customers & Locations count
        stmt_c = select(func.count(Customer.id)).where(Customer.is_deleted == False)
        res_c = await self.db.execute(stmt_c)
        total_customers = res_c.scalar_one() or 0

        stmt_l = select(func.count(Location.id)).where(Location.is_deleted == False)
        res_l = await self.db.execute(stmt_l)
        total_locations = res_l.scalar_one() or 0

        return PlatformExecutiveOverview(
            fleet=fleet_kpi,
            revenue=revenue_kpi,
            bookings=booking_kpi,
            popular_vehicles=popular_vehicles,
            total_customers=total_customers,
            total_locations=total_locations,
        )

    async def get_analytics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> ReportAnalyticsResponse:
        overview = await self.get_overview()

        # Monthly revenue & bookings time series
        stmt_ts = select(
            func.to_char(Booking.created_at, "YYYY-MM").label("period"),
            func.coalesce(func.sum(Booking.total_amount), 0).label("revenue"),
            func.count(Booking.id).label("count"),
        ).where(Booking.is_deleted == False)

        if start_date:
            stmt_ts = stmt_ts.where(Booking.created_at >= start_date)
        if end_date:
            stmt_ts = stmt_ts.where(Booking.created_at <= end_date)

        stmt_ts = stmt_ts.group_by("period").order_by("period")
        res_ts = await self.db.execute(stmt_ts)

        chart_data = [
            TimeSeriesDataPoint(
                period=row.period,
                revenue=Decimal(str(row.revenue)),
                bookings_count=row.count,
            )
            for row in res_ts.all()
        ]

        # Status distribution map
        stmt_status = (
            select(Booking.status, func.count(Booking.id))
            .where(Booking.is_deleted == False)
            .group_by(Booking.status)
        )
        res_status = await self.db.execute(stmt_status)
        dist = {
            (k.value if hasattr(k, "value") else str(k)): v
            for k, v in res_status.all()
        }

        return ReportAnalyticsResponse(
            overview=overview,
            revenue_chart=chart_data,
            status_distribution=dist,
        )

    async def export_bookings_csv(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[BookingStatus] = None,
    ) -> str:
        stmt = select(Booking).where(Booking.is_deleted == False)
        if start_date:
            stmt = stmt.where(Booking.created_at >= start_date)
        if end_date:
            stmt = stmt.where(Booking.created_at <= end_date)
        if status:
            stmt = stmt.where(Booking.status == status)

        stmt = stmt.order_by(desc(Booking.created_at))
        res = await self.db.execute(stmt)
        bookings = res.scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Booking Reference",
            "Customer Name",
            "Customer Email",
            "Customer Phone",
            "Driver License",
            "Vehicle ID",
            "Start Datetime",
            "End Datetime",
            "Rental Days",
            "Status",
            "Daily Rate",
            "Base Amount",
            "Location Fee",
            "Tax Amount",
            "Discount Amount",
            "Deposit Amount",
            "Total Amount",
            "Created At",
        ])

        for b in bookings:
            writer.writerow([
                b.booking_reference,
                b.customer_name or "",
                b.customer_email or "",
                b.customer_phone or "",
                b.driver_license_number or "",
                str(b.vehicle_id),
                b.start_datetime.isoformat() if b.start_datetime else "",
                b.end_datetime.isoformat() if b.end_datetime else "",
                b.total_days,
                b.status.value if hasattr(b.status, "value") else str(b.status),
                str(b.daily_rate),
                str(b.base_amount),
                str(b.location_fee),
                str(b.tax_amount),
                str(b.discount_amount),
                str(b.deposit_amount),
                str(b.total_amount),
                b.created_at.isoformat() if b.created_at else "",
            ])

        return output.getvalue()
