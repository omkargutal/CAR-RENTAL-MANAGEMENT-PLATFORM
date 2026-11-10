from typing import Sequence
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.repositories import BaseRepository
from app.modules.testimonials.models import Testimonial


class TestimonialRepository(BaseRepository[Testimonial]):
    def __init__(self, db: AsyncSession):
        super().__init__(Testimonial, db)

    async def list_active(self) -> Sequence[Testimonial]:
        """Fetch all non-deleted, active testimonials ordered by sort_order and created_at."""
        stmt = (
            select(Testimonial)
            .where(
                Testimonial.is_active == True,
                Testimonial.is_deleted == False,
            )
            .order_by(Testimonial.sort_order.asc(), Testimonial.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def list_all_admin(self) -> Sequence[Testimonial]:
        """Fetch all non-deleted testimonials for administrative control."""
        stmt = (
            select(Testimonial)
            .where(Testimonial.is_deleted == False)
            .order_by(Testimonial.sort_order.asc(), Testimonial.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
