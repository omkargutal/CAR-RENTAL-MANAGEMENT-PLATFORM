import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.common.schemas import ResponseEnvelope
from app.modules.reviews.dependencies import get_review_service
from app.modules.reviews.schemas import ReviewCreate, ReviewRead
from app.modules.reviews.service import ReviewService

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get("", response_model=ResponseEnvelope[List[ReviewRead]])
async def list_reviews(
    vehicle_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: ReviewService = Depends(get_review_service),
):
    if vehicle_id:
        reviews = await service.list_by_vehicle(vehicle_id, skip=skip, limit=limit)
    else:
        reviews = await service.list(skip=skip, limit=limit)
    return ResponseEnvelope(data=[ReviewRead.model_validate(r) for r in reviews])


@router.post("", response_model=ResponseEnvelope[ReviewRead], status_code=status.HTTP_201_CREATED)
async def create_review(
    payload: ReviewCreate,
    service: ReviewService = Depends(get_review_service),
):
    review = await service.create_review(payload)
    return ResponseEnvelope(data=ReviewRead.model_validate(review))
