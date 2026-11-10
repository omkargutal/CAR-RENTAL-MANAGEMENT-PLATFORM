"""booking and availability engine: exclusion constraint, range types, integer cents, and lifecycle

Revision ID: 0004_booking_and_availability_engine
Revises: 0003_vehicle_fleet_expansion
Create Date: 2026-11-02 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0004_booking_engine"
down_revision: Union[str, None] = "0003_vehicle_fleet_expansion"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable btree_gist extension for exclusion constraint with = and &&
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")

    # 2. Add new enum values to booking_status_enum safely
    # Note: Enum values might already be added
    for status_val in ["AWAITING_PAYMENT", "REJECTED", "REFUND_PENDING", "REFUNDED"]:
        op.execute(f"ALTER TYPE booking_status_enum ADD VALUE IF NOT EXISTS '{status_val}';")

    # 3. Add customer fields and pricing integer minor unit columns to bookings
    conn = op.get_bind()

    # Drop NOT NULL on customer_id so direct guest/customer flow works cleanly
    op.alter_column("bookings", "customer_id", nullable=True)

    op.add_column("bookings", sa.Column("customer_name", sa.String(150), nullable=True))
    op.add_column("bookings", sa.Column("customer_email", sa.String(255), nullable=True))
    op.add_column("bookings", sa.Column("customer_phone", sa.String(32), nullable=True))
    op.add_column("bookings", sa.Column("driver_license_number", sa.String(64), nullable=True))

    # Pricing minor units (cents)
    op.add_column("bookings", sa.Column("currency", sa.String(3), nullable=False, server_default="USD"))
    op.add_column("bookings", sa.Column("daily_rate_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("bookings", sa.Column("base_amount_cents", sa.BigInteger(), nullable=False, server_default="0"))
    op.add_column("bookings", sa.Column("location_fee_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("bookings", sa.Column("tax_amount_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("bookings", sa.Column("discount_amount_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("bookings", sa.Column("deposit_amount_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("bookings", sa.Column("total_amount_cents", sa.BigInteger(), nullable=False, server_default="0"))

    # Buffer and lifecycle management
    op.add_column("bookings", sa.Column("buffer_minutes", sa.Integer(), nullable=False, server_default="60"))
    op.add_column("bookings", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("bookings", sa.Column("idempotency_key", sa.String(128), nullable=True))

    # Index for idempotency
    op.create_index("ix_bookings_idempotency_key", "bookings", ["idempotency_key"], unique=True)
    op.create_index("ix_bookings_expires_at", "bookings", ["expires_at"])

    # Backfill integer cents for existing rows
    op.execute("""
        UPDATE bookings SET
            daily_rate_cents = ROUND(daily_rate * 100),
            base_amount_cents = ROUND(total_amount * 100),
            deposit_amount_cents = ROUND(deposit_amount * 100),
            total_amount_cents = ROUND(total_amount * 100)
        WHERE total_amount_cents = 0;
    """)

    # 4. Range type rental_period column
    # Check if rental_period column already exists
    res = conn.execute(sa.text("""
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'rental_period'
    """)).scalar()
    
    if not res:
        op.add_column("bookings", sa.Column("rental_period", postgresql.TSTZRANGE(), nullable=True))
        op.execute("UPDATE bookings SET rental_period = tstzrange(start_datetime, end_datetime, '[)');")
        op.alter_column("bookings", "rental_period", nullable=False)

    # 5. Exclusion constraint for anti-double booking
    # Check if constraint exists
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


def downgrade() -> None:
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_vehicle_bookings;")
    op.drop_index("ix_bookings_expires_at", "bookings")
    op.drop_index("ix_bookings_idempotency_key", "bookings")
    op.drop_column("bookings", "rental_period")
    op.drop_column("bookings", "idempotency_key")
    op.drop_column("bookings", "expires_at")
    op.drop_column("bookings", "buffer_minutes")
    op.drop_column("bookings", "total_amount_cents")
    op.drop_column("bookings", "deposit_amount_cents")
    op.drop_column("bookings", "discount_amount_cents")
    op.drop_column("bookings", "tax_amount_cents")
    op.drop_column("bookings", "location_fee_cents")
    op.drop_column("bookings", "base_amount_cents")
    op.drop_column("bookings", "daily_rate_cents")
    op.drop_column("bookings", "currency")
    op.drop_column("bookings", "driver_license_number")
    op.drop_column("bookings", "customer_phone")
    op.drop_column("bookings", "customer_email")
    op.drop_column("bookings", "customer_name")
    op.alter_column("bookings", "customer_id", nullable=False)
