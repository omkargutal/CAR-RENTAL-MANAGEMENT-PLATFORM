from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from app.common.schemas import ResponseEnvelope
from app.modules.auth.dependencies import require_staff_or_admin
from app.modules.bookings.models import BookingStatus
from app.modules.reports.dependencies import get_report_service
from app.modules.reports.schemas import (
    PlatformExecutiveOverview,
    ReportAnalyticsResponse,
)
from app.modules.reports.service import ReportService
from app.modules.users.models import User

router = APIRouter(prefix="/reports", tags=["Reports & Business Analytics"])


@router.get("/overview", response_model=ResponseEnvelope[PlatformExecutiveOverview])
async def get_overview(
    current_user: User = Depends(require_staff_or_admin),
    service: ReportService = Depends(get_report_service),
):
    """
    Retrieves live executive platform overview with vehicle status, booking counts,
    total and monthly revenue, and top performing vehicles directly from PostgreSQL.
    """
    data = await service.get_overview()
    return ResponseEnvelope(data=data)


@router.get("/analytics", response_model=ResponseEnvelope[ReportAnalyticsResponse])
async def get_analytics(
    start_date: Optional[datetime] = Query(None, description="Start date filter (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date filter (ISO format)"),
    current_user: User = Depends(require_staff_or_admin),
    service: ReportService = Depends(get_report_service),
):
    """
    Retrieves time series analytics for revenue and booking volume,
    plus status distribution for charting.
    """
    data = await service.get_analytics(start_date=start_date, end_date=end_date)
    return ResponseEnvelope(data=data)


@router.get("/export/bookings")
async def export_bookings(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[BookingStatus] = Query(None),
    current_user: User = Depends(require_staff_or_admin),
    service: ReportService = Depends(get_report_service),
):
    """
    Generates and downloads an exportable CSV report of bookings based on date and status filters.
    """
    csv_content = await service.export_bookings_csv(start_date=start_date, end_date=end_date, status=status)
    filename = f"bookings_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
