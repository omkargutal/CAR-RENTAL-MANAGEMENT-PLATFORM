"""business settings: dynamic pricing, deposits, taxes, policies, and contacts

Revision ID: 0005_business_settings
Revises: 0004_booking_engine
Create Date: 2026-11-02 19:40:00.000000

"""
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0005_business_settings"
down_revision: Union[str, None] = "0004_booking_engine"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "business_settings" not in tables:
        op.create_table(
            "business_settings",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("key", sa.String(64), unique=True, index=True, nullable=False),
            sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )

        # Seed initial default business configuration
        initial_json = sa.text("""
            INSERT INTO business_settings (id, key, data, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'general',
                '{
                    "pricing": {
                        "rate_multiplier": 1.0,
                        "category_deposits": {
                            "LUXURY": 500,
                            "SUV": 300,
                            "VAN": 300,
                            "TRUCK": 300,
                            "SEDAN": 200,
                            "DEFAULT": 200
                        }
                    },
                    "cancellation_policy": {
                        "free_cancellation_hours": 24,
                        "fee_percentage_after_deadline": 20,
                        "policy_text": "Free cancellation up to 24 hours prior to scheduled pickup. Late cancellations are subject to a 20% administrative fee."
                    },
                    "tax_and_discounts": {
                        "tax_rate_percent": 10.0,
                        "active_promo_codes": [
                            {"code": "SAVE10", "discount_percent": 10, "description": "10% off entire booking"},
                            {"code": "WELCOME10", "discount_percent": 10, "description": "New customer welcome offer"}
                        ]
                    },
                    "contact_info": {
                        "company_name": "AutoFleet Pro Global Rentals",
                        "support_email": "concierge@autofleetpro.com",
                        "phone": "+1 (800) 555-AUTO",
                        "address": "742 Evergreen Terrace, Suite 500, New York, NY 10001",
                        "support_hours": "24/7 Concierge Support"
                    },
                    "turnaround_buffer_minutes": 60
                }'::jsonb,
                now(),
                now()
            )
            ON CONFLICT (key) DO NOTHING;
        """)
        conn.execute(initial_json)


def downgrade() -> None:
    op.drop_table("business_settings")
