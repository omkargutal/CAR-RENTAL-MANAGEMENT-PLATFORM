from datetime import datetime, timezone
from typing import Any, Dict
from sqlalchemy import DateTime, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from app.common.models import Base, UUIDPrimaryKeyMixin


class BusinessSetting(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "business_settings"

    key: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
