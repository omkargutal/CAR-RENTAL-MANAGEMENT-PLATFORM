"""payment gateway integration: razorpay orders, refunds, transactions, and webhooks

Revision ID: 0006_payment_gateway
Revises: 0005_business_settings
Create Date: 2026-11-02 21:50:00.000000

"""
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0006_payment_gateway"
down_revision: Union[str, None] = "0005_business_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. Update payment_status_enum to include additional statuses
    op.execute("ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'AUTHORIZED';")
    op.execute("ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'CAPTURED';")
    op.execute("ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';")

    # 2. Payment Orders Table
    if "payment_orders" not in tables:
        op.create_table(
            "payment_orders",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("order_reference", sa.String(64), unique=True, index=True, nullable=False),
            sa.Column(
                "booking_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("bookings.id", ondelete="RESTRICT"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "customer_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("customers.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
            sa.Column("amount_cents", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
            sa.Column("payment_type", sa.String(32), nullable=False, server_default="FULL"),
            sa.Column("status", sa.String(32), nullable=False, server_default="PENDING", index=True),
            sa.Column("receipt_number", sa.String(64), unique=True, index=True, nullable=False),
            sa.Column("notes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_payment_orders_created_at", "payment_orders", ["created_at"])

    # 3. Enhance payments table
    payments_cols = [c["name"] for c in inspector.get_columns("payments")] if "payments" in tables else []
    if "order_id" not in payments_cols:
        op.add_column(
            "payments",
            sa.Column(
                "order_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("payment_orders.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )
        op.create_index("ix_payments_order_id", "payments", ["order_id"])

    if "amount_cents" not in payments_cols:
        op.add_column("payments", sa.Column("amount_cents", sa.Integer(), nullable=True))
        # Backfill amount_cents from amount * 100
        op.execute("UPDATE payments SET amount_cents = CAST(ROUND(amount * 100) AS INTEGER) WHERE amount_cents IS NULL;")

    if "receipt_number" not in payments_cols:
        op.add_column("payments", sa.Column("receipt_number", sa.String(64), nullable=True))
        op.create_index("ix_payments_receipt_number", "payments", ["receipt_number"])

    if "payment_type" not in payments_cols:
        op.add_column("payments", sa.Column("payment_type", sa.String(32), nullable=False, server_default="FULL"))

    if "gateway_order_id" not in payments_cols:
        op.add_column("payments", sa.Column("gateway_order_id", sa.String(64), nullable=True))
        op.create_index("ix_payments_gateway_order_id", "payments", ["gateway_order_id"])

    if "gateway_payment_id" not in payments_cols:
        op.add_column("payments", sa.Column("gateway_payment_id", sa.String(64), nullable=True))
        op.create_index("ix_payments_gateway_payment_id", "payments", ["gateway_payment_id"])

    if "gateway_signature" not in payments_cols:
        op.add_column("payments", sa.Column("gateway_signature", sa.String(255), nullable=True))

    if "card_network" not in payments_cols:
        op.add_column("payments", sa.Column("card_network", sa.String(32), nullable=True))

    if "card_last4" not in payments_cols:
        op.add_column("payments", sa.Column("card_last4", sa.String(4), nullable=True))

    if "upi_vpa" not in payments_cols:
        op.add_column("payments", sa.Column("upi_vpa", sa.String(128), nullable=True))

    if "captured_at" not in payments_cols:
        op.add_column("payments", sa.Column("captured_at", sa.DateTime(timezone=True), nullable=True))

    # 4. Payment Refunds Table
    if "payment_refunds" not in tables:
        op.create_table(
            "payment_refunds",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("refund_reference", sa.String(64), unique=True, index=True, nullable=False),
            sa.Column(
                "payment_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("payments.id", ondelete="RESTRICT"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "booking_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("bookings.id", ondelete="RESTRICT"),
                nullable=False,
                index=True,
            ),
            sa.Column("amount_cents", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("status", sa.String(32), nullable=False, server_default="PROCESSED", index=True),
            sa.Column("gateway_refund_id", sa.String(64), nullable=True, index=True),
            sa.Column("gateway_response", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )

    # 5. Payment Transactions Table (Audit & History)
    if "payment_transactions" not in tables:
        op.create_table(
            "payment_transactions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column(
                "payment_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("payments.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
            sa.Column(
                "order_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("payment_orders.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
            sa.Column(
                "booking_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("bookings.id", ondelete="SET NULL"),
                nullable=True,
                index=True,
            ),
            sa.Column("transaction_type", sa.String(32), nullable=False, index=True),
            sa.Column("amount_cents", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
            sa.Column("status", sa.String(32), nullable=False, index=True),
            sa.Column("gateway_reference", sa.String(64), nullable=True, index=True),
            sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_payment_transactions_created_at", "payment_transactions", ["created_at"])

    # 6. Payment Webhook Events Table (Idempotent delivery store)
    if "payment_webhook_events" not in tables:
        op.create_table(
            "payment_webhook_events",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("event_id", sa.String(128), unique=True, index=True, nullable=False),
            sa.Column("event_type", sa.String(64), nullable=False, index=True),
            sa.Column("provider", sa.String(32), nullable=False, server_default="razorpay"),
            sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="RECEIVED", index=True),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )


def downgrade() -> None:
    op.drop_table("payment_webhook_events")
    op.drop_table("payment_transactions")
    op.drop_table("payment_refunds")
    op.drop_table("payment_orders")
