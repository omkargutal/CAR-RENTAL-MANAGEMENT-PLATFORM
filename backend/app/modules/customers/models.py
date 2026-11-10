from datetime import date
from typing import TYPE_CHECKING
import uuid
from sqlalchemy import Boolean, Date, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.common.models import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.modules.users.models import User


class Customer(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "customers"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    driver_license_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    driver_license_expiry: Mapped[date] = mapped_column(Date, nullable=False)
    driver_license_country: Mapped[str] = mapped_column(String(64), default="US", nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    is_identity_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship("User", lazy="selectin")
