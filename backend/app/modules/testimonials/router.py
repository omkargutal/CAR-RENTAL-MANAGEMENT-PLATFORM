from typing import Any, Dict, List
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.common.schemas import ResponseEnvelope
from app.integrations.storage_minio import get_storage_provider
from app.interfaces.storage import StorageProvider
from app.modules.auth.dependencies import require_admin
from app.modules.testimonials.dependencies import get_testimonial_service
from app.modules.testimonials.schemas import (
    TestimonialCreate,
    TestimonialRead,
    TestimonialStatusUpdate,
    TestimonialUpdate,
)
from app.modules.testimonials.service import TestimonialService
from app.modules.users.models import User

router = APIRouter(prefix="/testimonials", tags=["Testimonials"])


# ------------------------------------------------------------------------------
# 1. Public Endpoints
# ------------------------------------------------------------------------------

@router.get("", response_model=ResponseEnvelope[List[TestimonialRead]])
async def list_active_testimonials(
    service: TestimonialService = Depends(get_testimonial_service),
):
    """Public endpoint: returns all active testimonials for public carousel."""
    items = await service.get_active_testimonials()
    return ResponseEnvelope(data=[TestimonialRead.model_validate(t) for t in items])


# ------------------------------------------------------------------------------
# 2. Admin Endpoints
# ------------------------------------------------------------------------------

@router.get("/admin/all", response_model=ResponseEnvelope[List[TestimonialRead]])
async def list_all_testimonials_admin(
    current_user: User = Depends(require_admin),
    service: TestimonialService = Depends(get_testimonial_service),
):
    """Admin endpoint: returns all testimonials including active and inactive."""
    items = await service.get_all_testimonials_admin()
    return ResponseEnvelope(data=[TestimonialRead.model_validate(t) for t in items])


@router.post("", response_model=ResponseEnvelope[TestimonialRead], status_code=status.HTTP_201_CREATED)
async def create_testimonial(
    payload: TestimonialCreate,
    current_user: User = Depends(require_admin),
    service: TestimonialService = Depends(get_testimonial_service),
):
    """Admin endpoint: creates a new customer testimonial."""
    testimonial = await service.create_testimonial(payload)
    return ResponseEnvelope(
        data=TestimonialRead.model_validate(testimonial),
        message="Testimonial created successfully.",
    )


@router.get("/{testimonial_id}", response_model=ResponseEnvelope[TestimonialRead])
async def get_testimonial(
    testimonial_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    service: TestimonialService = Depends(get_testimonial_service),
):
    """Admin endpoint: fetch a single testimonial by ID."""
    testimonial = await service.get_by_id(testimonial_id)
    return ResponseEnvelope(data=TestimonialRead.model_validate(testimonial))


@router.put("/{testimonial_id}", response_model=ResponseEnvelope[TestimonialRead])
async def update_testimonial(
    testimonial_id: uuid.UUID,
    payload: TestimonialUpdate,
    current_user: User = Depends(require_admin),
    service: TestimonialService = Depends(get_testimonial_service),
):
    """Admin endpoint: update an existing testimonial."""
    testimonial = await service.update_testimonial(testimonial_id, payload)
    return ResponseEnvelope(
        data=TestimonialRead.model_validate(testimonial),
        message="Testimonial updated successfully.",
    )


@router.patch("/{testimonial_id}/status", response_model=ResponseEnvelope[TestimonialRead])
async def toggle_testimonial_status(
    testimonial_id: uuid.UUID,
    payload: TestimonialStatusUpdate,
    current_user: User = Depends(require_admin),
    service: TestimonialService = Depends(get_testimonial_service),
):
    """Admin endpoint: toggle Active/Inactive status."""
    testimonial = await service.toggle_active_status(testimonial_id, payload.is_active)
    status_label = "active" if payload.is_active else "inactive"
    return ResponseEnvelope(
        data=TestimonialRead.model_validate(testimonial),
        message=f"Testimonial is now {status_label}.",
    )


@router.delete("/{testimonial_id}", response_model=ResponseEnvelope[Dict[str, bool]])
async def delete_testimonial(
    testimonial_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    service: TestimonialService = Depends(get_testimonial_service),
):
    """Admin endpoint: soft-delete a testimonial."""
    await service.delete_testimonial(testimonial_id)
    return ResponseEnvelope(
        data={"deleted": True},
        message="Testimonial deleted successfully.",
    )


@router.post("/upload-image", response_model=ResponseEnvelope[Dict[str, str]])
async def upload_testimonial_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    storage: StorageProvider = Depends(get_storage_provider),
):
    """Admin endpoint: upload customer profile image to object storage."""
    file_ext = (file.filename or "image.jpg").split(".")[-1].lower()
    if file_ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WebP images are supported.")
    
    storage_path = f"testimonials/{uuid.uuid4()}.{file_ext}"
    public_url = await storage.upload_file(
        file_obj=file.file,
        path=storage_path,
        content_type=file.content_type or "image/jpeg",
    )
    return ResponseEnvelope(
        data={"url": public_url},
        message="Image uploaded successfully.",
    )
