"""update database column server defaults for currency to INR

Revision ID: 0011_currency_default_inr
Revises: 0010_drop_overlap_constraint
Create Date: 2026-11-10 11:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0011_currency_default_inr"
down_revision: Union[str, None] = "0010_drop_overlap_constraint"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # Update server default to 'INR' for relevant tables
    if "bookings" in tables:
        op.alter_column("bookings", "currency", server_default="INR")
        op.execute("UPDATE bookings SET currency = 'INR' WHERE currency = 'USD' OR currency IS NULL;")

    if "payment_orders" in tables:
        op.alter_column("payment_orders", "currency", server_default="INR")
        op.execute("UPDATE payment_orders SET currency = 'INR' WHERE currency = 'USD' OR currency IS NULL;")

    if "payments" in tables:
        op.alter_column("payments", "currency", server_default="INR")
        op.execute("UPDATE payments SET currency = 'INR' WHERE currency = 'USD' OR currency IS NULL;")

    if "payment_refunds" in tables:
        op.alter_column("payment_refunds", "currency", server_default="INR")
        op.execute("UPDATE payment_refunds SET currency = 'INR' WHERE currency = 'USD' OR currency IS NULL;")

    if "payment_transactions" in tables:
        op.alter_column("payment_transactions", "currency", server_default="INR")
        op.execute("UPDATE payment_transactions SET currency = 'INR' WHERE currency = 'USD' OR currency IS NULL;")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "bookings" in tables:
        op.alter_column("bookings", "currency", server_default="USD")

    if "payment_orders" in tables:
        op.alter_column("payment_orders", "currency", server_default="USD")

    if "payments" in tables:
        op.alter_column("payments", "currency", server_default="USD")

    if "payment_refunds" in tables:
        op.alter_column("payment_refunds", "currency", server_default="USD")

    if "payment_transactions" in tables:
        op.alter_column("payment_transactions", "currency", server_default="USD")
