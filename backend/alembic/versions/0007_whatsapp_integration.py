"""whatsapp integration: cloud api config, conversations, messages, templates

Revision ID: 0007_whatsapp_integration
Revises: 0006_payment_gateway
Create Date: 2026-11-02 23:15:00.000000

"""
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0007_whatsapp_integration"
down_revision: Union[str, None] = "0006_payment_gateway"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. whatsapp_config
    if "whatsapp_config" not in tables:
        op.create_table(
            "whatsapp_config",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("phone_number_id", sa.String(64), nullable=True),
            sa.Column("waba_id", sa.String(64), nullable=True),
            sa.Column("business_phone_number", sa.String(32), nullable=True),
            sa.Column("display_phone_number", sa.String(32), nullable=True),
            sa.Column("access_token", sa.Text(), nullable=True),
            sa.Column("verify_token", sa.String(128), nullable=True),
            sa.Column("app_id", sa.String(64), nullable=True),
            sa.Column("app_secret", sa.String(128), nullable=True),
            sa.Column("floating_button_enabled", sa.Boolean(), server_default="true", nullable=False),
            sa.Column(
                "floating_button_greeting",
                sa.Text(),
                server_default="Hi! I am interested in renting a car with AutoFleet Pro.",
                nullable=False,
            ),
            sa.Column("status", sa.String(32), server_default="NOT_CONFIGURED", nullable=False),
            sa.Column("status_details", sa.Text(), nullable=True),
            sa.Column("admin_notification_phone", sa.String(32), nullable=True),
            sa.Column(
                "notification_preferences",
                postgresql.JSONB(astext_type=sa.Text()),
                server_default=sa.text(
                    "'{\"customer\": {\"booking_confirmation\": true, \"payment_success\": true, \"cancellation\": true, \"reminders\": true}, \"admin\": {\"new_booking\": true, \"payment_success\": true, \"cancellation\": true, \"human_support\": true}}'"
                ),
                nullable=False,
            ),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 2. whatsapp_conversations
    if "whatsapp_conversations" not in tables:
        op.create_table(
            "whatsapp_conversations",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("phone_number", sa.String(32), index=True, nullable=False),
            sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
            sa.Column("customer_name", sa.String(128), nullable=True),
            sa.Column("status", sa.String(32), server_default="BOT", nullable=False),  # BOT, HUMAN_AGENT, CLOSED
            sa.Column("last_message_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("unread_admin_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 3. whatsapp_messages
    if "whatsapp_messages" not in tables:
        op.create_table(
            "whatsapp_messages",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column(
                "conversation_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("whatsapp_conversations.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("wamid", sa.String(128), unique=True, index=True, nullable=True),
            sa.Column("direction", sa.String(16), nullable=False),  # INBOUND, OUTBOUND
            sa.Column("message_type", sa.String(32), server_default="TEXT", nullable=False),  # TEXT, TEMPLATE, INTERACTIVE
            sa.Column("sender_phone", sa.String(32), nullable=False),
            sa.Column("recipient_phone", sa.String(32), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("template_name", sa.String(64), nullable=True),
            sa.Column("status", sa.String(32), server_default="SENT", nullable=False),  # PENDING, SENT, DELIVERED, READ, FAILED
            sa.Column("error_code", sa.String(64), nullable=True),
            sa.Column("error_description", sa.Text(), nullable=True),
            sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 4. whatsapp_templates
    if "whatsapp_templates" not in tables:
        op.create_table(
            "whatsapp_templates",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("name", sa.String(64), unique=True, nullable=False),
            sa.Column("category", sa.String(32), server_default="UTILITY", nullable=False),
            sa.Column("language", sa.String(16), server_default="en_US", nullable=False),
            sa.Column("body_template", sa.Text(), nullable=False),
            sa.Column("status", sa.String(32), server_default="APPROVED", nullable=False),
            sa.Column("example_parameters", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table("whatsapp_messages")
    op.drop_table("whatsapp_conversations")
    op.drop_table("whatsapp_templates")
    op.drop_table("whatsapp_config")
