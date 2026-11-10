from datetime import datetime
import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, status
from app.common.schemas import ResponseEnvelope
from app.modules.availability.dependencies import get_availability_service
from app.modules.availability.schemas import (
    AvailabilityBlockCreate,
    AvailabilityBlockRead,
    AvailabilityResult,
)
from app.modules.availability.service import AvailabilityService

router = APIRouter(prefix="/availability", tags=["Availability"])


@router.get("/check", response_model=ResponseEnvelope[AvailabilityResult])
async def check_vehicle_availability(
    vehicle_id: uuid.UUID = Query(...),
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    service: AvailabilityService = Depends(get_availability_service),
):
    result = await service.check_availability(vehicle_id, start_time, end_time)
    return ResponseEnvelope(data=result)


@router.post("/blocks", response_model=ResponseEnvelope[AvailabilityBlockRead], status_code=status.HTTP_201_CREATED)
async def create_availability_block(
    payload: AvailabilityBlockCreate,
    service: AvailabilityService = Depends(get_availability_service),
):
    block = await service.create_block(payload)
    return ResponseEnvelope(data=AvailabilityBlockRead.model_validate(block))


@router.get("/blocks", response_model=ResponseEnvelope[List[AvailabilityBlockRead]])
async def list_blocks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: AvailabilityService = Depends(get_availability_service),
):
    blocks = await service.list(skip=skip, limit=limit)
    return ResponseEnvelope(data=[AvailabilityBlockRead.model_validate(b) for b in blocks])
