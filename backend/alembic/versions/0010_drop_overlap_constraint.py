"""drop overlapping vehicle bookings exclusion constraint

Revision ID: 0010_drop_overlap_constraint
Revises: 0009_testimonials
Create Date: 2026-11-10 11:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0010_drop_overlap_constraint"
down_revision: Union[str, None] = "0009_testimonials"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    # Check if constraint exists before dropping
    res_con = conn.execute(sa.text("""
        SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_vehicle_bookings'
    """)).scalar()

    if res_con:
        op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_vehicle_bookings;")


def downgrade() -> None:
    conn = op.get_bind()
    res_con = conn.execute(sa.text("""
        SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_vehicle_bookings'
    """)).scalar()

    if not res_con:
        op.execute("""
            ALTER TABLE bookings
            ADD CONSTRAINT no_overlapping_vehicle_bookings
            EXCLUDE USING gist (
                vehicle_id WITH =,
                rental_period WITH &&
            )
            WHERE (status IN ('PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'ACTIVE') AND is_deleted = false);
        """)
