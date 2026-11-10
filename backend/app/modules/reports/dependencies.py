from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.reports.service import ReportService


def get_report_service(
    db: AsyncSession = Depends(get_db),
) -> ReportService:
    return ReportService(db)
