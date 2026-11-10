from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.reviews.repository import ReviewRepository
from app.modules.reviews.service import ReviewService


def get_review_repository(
    db: AsyncSession = Depends(get_db),
) -> ReviewRepository:
    return ReviewRepository(db)


def get_review_service(
    repo: ReviewRepository = Depends(get_review_repository),
) -> ReviewService:
    return ReviewService(repo)
