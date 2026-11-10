"""testimonials: database model, admin management, and public carousel

Revision ID: 0009_testimonials
Revises: 0008_vehicle_display_order
Create Date: 2026-11-06 16:30:00.000000

"""
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0009_testimonials"
down_revision: Union[str, None] = "0008_vehicle_display_order"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "testimonials" not in tables:
        op.create_table(
            "testimonials",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
            sa.Column("name", sa.String(150), nullable=False, index=True),
            sa.Column("designation", sa.String(150), nullable=False),
            sa.Column("review", sa.Text, nullable=False),
            sa.Column("rating", sa.Integer, default=5, nullable=False),
            sa.Column("image_url", sa.String(500), nullable=True),
            sa.Column("is_active", sa.Boolean, default=True, nullable=False, index=True),
            sa.Column("sort_order", sa.Integer, default=0, nullable=False),
            sa.Column("is_deleted", sa.Boolean, default=False, nullable=False, index=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )

        # Seed existing canonical testimonials into the database
        seed_sql = sa.text("""
            INSERT INTO testimonials (id, name, designation, review, rating, image_url, is_active, sort_order, is_deleted, created_at, updated_at)
            VALUES 
            (
                gen_random_uuid(),
                'Sarah Mitchell',
                'Corporate Mobility Lead',
                'AutoFleet Pro handles our executive team''s airport transfers and daily employee shift shuttles with flawless punctuality and spotless vehicles.',
                5,
                'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80',
                true,
                1,
                false,
                now(),
                now()
            ),
            (
                gen_random_uuid(),
                'Rajesh Deshmukh',
                'Family Outstation Traveler',
                'Booked an Innova Crysta for our family''s Ashtavinayak pilgrimage tour. The driver was exceptionally polite, knowledgeable of routes, and very patient with senior citizens.',
                5,
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
                true,
                2,
                false,
                now(),
                now()
            ),
            (
                gen_random_uuid(),
                'Priya Nair',
                'Frequent Airport Commuter',
                'Guaranteed airport pickup at 4:30 AM without a second of delay! The cab was sanitized, driver assisted with heavy baggage, and the pricing was completely transparent.',
                5,
                'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80',
                true,
                3,
                false,
                now(),
                now()
            );
        """)
        conn.execute(seed_sql)


def downgrade() -> None:
    op.drop_table("testimonials")
