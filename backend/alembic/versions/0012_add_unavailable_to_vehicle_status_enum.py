"""add UNAVAILABLE to vehicle_status_enum

Revision ID: 0012_add_unavailable_status
Revises: 0011_currency_default_inr
Create Date: 2026-11-10 12:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0012_add_unavailable_status"
down_revision: Union[str, None] = "0011_currency_default_inr"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add UNAVAILABLE value to vehicle_status_enum if not already present
    op.execute("ALTER TYPE vehicle_status_enum ADD VALUE IF NOT EXISTS 'UNAVAILABLE';")


def downgrade() -> None:
    # PostgreSQL does not support removing an enum value directly without recreating the type
    pass
