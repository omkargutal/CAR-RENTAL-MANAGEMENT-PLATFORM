"""vehicle fleet expansion: images, maintenance, categories, and rates

Revision ID: 0003_vehicle_fleet_expansion
Revises: 0002_auth_sessions_and_audit
Create Date: 2026-11-02 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0003_vehicle_fleet_expansion"
down_revision: Union[str, None] = "0002_auth_sessions_and_audit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add ARCHIVED to vehicle_status_enum if not present
    op.execute("ALTER TYPE vehicle_status_enum ADD VALUE IF NOT EXISTS 'ARCHIVED';")

    # 2. Add columns to vehicles table
    op.add_column("vehicles", sa.Column("weekly_rate", sa.Numeric(10, 2), nullable=True))
    op.add_column("vehicles", sa.Column("monthly_rate", sa.Numeric(10, 2), nullable=True))
    op.add_column("vehicles", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("vehicles", sa.Column("features", sa.JSON(), nullable=True))
    op.add_column("vehicles", sa.Column("specs", sa.JSON(), nullable=True))
    op.add_column("vehicles", sa.Column("doors", sa.Integer(), nullable=False, server_default="4"))
    op.add_column("vehicles", sa.Column("suitcases", sa.Integer(), nullable=False, server_default="2"))
    op.add_column("vehicles", sa.Column("popularity_score", sa.Integer(), nullable=False, server_default="0"))

    # 3. Vehicle Categories Table
    op.create_table(
        "vehicle_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False, unique=True),
        sa.Column("slug", sa.String(64), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(64), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_vehicle_categories_slug", "vehicle_categories", ["slug"])

    # 4. Vehicle Images Table
    op.create_table(
        "vehicle_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("caption", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_vehicle_images_vehicle_id", "vehicle_images", ["vehicle_id"])
    op.create_index("ix_vehicle_images_is_primary", "vehicle_images", ["is_primary"])

    # 5. Vehicle Maintenance Records Table
    op.create_table(
        "vehicle_maintenance_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_type", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cost", sa.Numeric(10, 2), nullable=True),
        sa.Column("service_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("performed_by", sa.String(150), nullable=True),
        sa.Column("mileage_at_service", sa.Integer(), nullable=True),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_vehicle_maintenance_vehicle_id", "vehicle_maintenance_records", ["vehicle_id"])
    op.create_index("ix_vehicle_maintenance_is_completed", "vehicle_maintenance_records", ["is_completed"])
    op.create_index("ix_vehicle_maintenance_service_date", "vehicle_maintenance_records", ["service_date"])


def downgrade() -> None:
    op.drop_table("vehicle_maintenance_records")
    op.drop_table("vehicle_images")
    op.drop_table("vehicle_categories")
    op.drop_column("vehicles", "popularity_score")
    op.drop_column("vehicles", "suitcases")
    op.drop_column("vehicles", "doors")
    op.drop_column("vehicles", "specs")
    op.drop_column("vehicles", "features")
    op.drop_column("vehicles", "description")
    op.drop_column("vehicles", "monthly_rate")
    op.drop_column("vehicles", "weekly_rate")
