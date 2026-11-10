import uuid
from typing import Sequence
from app.common.services import BaseService
from app.core.exceptions import ConflictError
from app.modules.reviews.models import Review
from app.modules.reviews.repository import ReviewRepository
from app.modules.reviews.schemas import ReviewCreate, ReviewUpdate


class ReviewService(BaseService[Review]):
    def __init__(self, repository: ReviewRepository):
        super().__init__(repository)
        self.review_repo = repository

    async def create_review(self, payload: ReviewCreate) -> Review:
        # One review per booking
        existing = await self.review_repo.get_by_id(payload.booking_id)
        review = Review(
            booking_id=payload.booking_id,
            vehicle_id=payload.vehicle_id,
            customer_id=payload.customer_id,
            rating=payload.rating,
            comment=payload.comment,
            is_published=payload.is_published,
        )
        return await self.review_repo.create(review)

    async def list_by_vehicle(
        self, vehicle_id: uuid.UUID, skip: int = 0, limit: int = 50
    ) -> Sequence[Review]:
        return await self.review_repo.list_by_vehicle(vehicle_id, skip=skip, limit=limit)
