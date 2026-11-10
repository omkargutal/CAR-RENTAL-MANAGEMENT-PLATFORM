from datetime import datetime, timezone
from typing import Sequence
import uuid
from app.core.exceptions import NotFoundError
from app.modules.testimonials.models import Testimonial
from app.modules.testimonials.repository import TestimonialRepository
from app.modules.testimonials.schemas import TestimonialCreate, TestimonialUpdate


class TestimonialService:
    def __init__(self, repository: TestimonialRepository):
        self.repository = repository

    async def get_active_testimonials(self) -> Sequence[Testimonial]:
        return await self.repository.list_active()

    async def get_all_testimonials_admin(self) -> Sequence[Testimonial]:
        return await self.repository.list_all_admin()

    async def get_by_id(self, testimonial_id: uuid.UUID) -> Testimonial:
        testimonial = await self.repository.get(testimonial_id)
        if not testimonial or testimonial.is_deleted:
            raise NotFoundError("Testimonial not found.")
        return testimonial

    async def create_testimonial(self, data: TestimonialCreate) -> Testimonial:
        testimonial = Testimonial(
            name=data.name.strip(),
            designation=data.designation.strip(),
            review=data.review.strip(),
            rating=data.rating,
            image_url=data.image_url.strip() if data.image_url else None,
            is_active=data.is_active,
            sort_order=data.sort_order,
        )
        return await self.repository.create(testimonial)

    async def update_testimonial(self, testimonial_id: uuid.UUID, data: TestimonialUpdate) -> Testimonial:
        testimonial = await self.get_by_id(testimonial_id)
        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if isinstance(value, str):
                value = value.strip()
            setattr(testimonial, key, value)
        return await self.repository.update(testimonial)

    async def toggle_active_status(self, testimonial_id: uuid.UUID, is_active: bool) -> Testimonial:
        testimonial = await self.get_by_id(testimonial_id)
        testimonial.is_active = is_active
        return await self.repository.update(testimonial)

    async def delete_testimonial(self, testimonial_id: uuid.UUID) -> bool:
        testimonial = await self.get_by_id(testimonial_id)
        testimonial.is_deleted = True
        testimonial.deleted_at = datetime.now(timezone.utc)
        await self.repository.update(testimonial)
        return True
