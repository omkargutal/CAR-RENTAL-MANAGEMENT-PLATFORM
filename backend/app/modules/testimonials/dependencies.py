from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.testimonials.repository import TestimonialRepository
from app.modules.testimonials.service import TestimonialService


def get_testimonial_repository(db: AsyncSession = Depends(get_db)) -> TestimonialRepository:
    return TestimonialRepository(db)


def get_testimonial_service(
    repo: TestimonialRepository = Depends(get_testimonial_repository),
) -> TestimonialService:
    return TestimonialService(repo)
