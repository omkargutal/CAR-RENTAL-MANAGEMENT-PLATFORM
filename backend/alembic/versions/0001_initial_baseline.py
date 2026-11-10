"""initial baseline schema

Revision ID: 0001_initial_baseline
Revises: 
Create Date: 2026-11-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users Table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("ADMIN", "MANAGER", "STAFF", "CUSTOMER", name="user_role_enum"),
            nullable=False,
            server_default="CUSTOMER",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("phone_number", sa.String(32), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_is_deleted", "users", ["is_deleted"])

    # 2. Locations Table
    op.create_table(
        "locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("code", sa.String(32), nullable=False, unique=True),
        sa.Column("address", sa.String(255), nullable=False),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("state", sa.String(100), nullable=False),
        sa.Column("country", sa.String(100), nullable=False, server_default="US"),
        sa.Column("postal_code", sa.String(32), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("phone", sa.String(32), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_locations_code", "locations", ["code"])
    op.create_index("ix_locations_city", "locations", ["city"])
    op.create_index("ix_locations_is_deleted", "locations", ["is_deleted"])

    # 3. Vehicles Table
    op.create_table(
        "vehicles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("vin", sa.String(32), nullable=False, unique=True),
        sa.Column("make", sa.String(64), nullable=False),
        sa.Column("model", sa.String(64), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("license_plate", sa.String(32), nullable=False, unique=True),
        sa.Column(
            "category",
            sa.Enum("ECONOMY", "COMPACT", "SEDAN", "SUV", "LUXURY", "VAN", "TRUCK", name="vehicle_category_enum"),
            nullable=False,
            server_default="SEDAN",
        ),
        sa.Column(
            "status",
            sa.Enum("AVAILABLE", "RENTED", "MAINTENANCE", "RESERVED", "OUT_OF_SERVICE", name="vehicle_status_enum"),
            nullable=False,
            server_default="AVAILABLE",
        ),
        sa.Column(
            "fuel_type",
            sa.Enum("GASOLINE", "DIESEL", "ELECTRIC", "HYBRID", name="fuel_type_enum"),
            nullable=False,
            server_default="GASOLINE",
        ),
        sa.Column(
            "transmission",
            sa.Enum("AUTOMATIC", "MANUAL", name="transmission_type_enum"),
            nullable=False,
            server_default="AUTOMATIC",
        ),
        sa.Column("seats", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("mileage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("daily_rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column(
            "location_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("locations.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_vehicles_vin", "vehicles", ["vin"])
    op.create_index("ix_vehicles_make", "vehicles", ["make"])
    op.create_index("ix_vehicles_model", "vehicles", ["model"])
    op.create_index("ix_vehicles_category", "vehicles", ["category"])
    op.create_index("ix_vehicles_status", "vehicles", ["status"])
    op.create_index("ix_vehicles_location_id", "vehicles", ["location_id"])
    op.create_index("ix_vehicles_is_deleted", "vehicles", ["is_deleted"])

    # 4. Customers Table
    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("driver_license_number", sa.String(64), nullable=False, unique=True),
        sa.Column("driver_license_expiry", sa.Date(), nullable=False),
        sa.Column("driver_license_country", sa.String(64), nullable=False, server_default="US"),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("is_identity_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_customers_user_id", "customers", ["user_id"])
    op.create_index("ix_customers_is_deleted", "customers", ["is_deleted"])

    # 5. Bookings Table
    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("booking_reference", sa.String(32), nullable=False, unique=True),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("customers.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "vehicle_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vehicles.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "pickup_location_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("locations.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "return_location_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("locations.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("start_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_datetime", sa.DateTime(timezone=True), nullable=False),
        sa.Column("total_days", sa.Integer(), nullable=False),
        sa.Column("daily_rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("deposit_amount", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column(
            "status",
            sa.Enum("PENDING", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED", name="booking_status_enum"),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("cancellation_reason", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_bookings_booking_reference", "bookings", ["booking_reference"])
    op.create_index("ix_bookings_customer_id", "bookings", ["customer_id"])
    op.create_index("ix_bookings_vehicle_id", "bookings", ["vehicle_id"])
    op.create_index("ix_bookings_start_datetime", "bookings", ["start_datetime"])
    op.create_index("ix_bookings_end_datetime", "bookings", ["end_datetime"])
    op.create_index("ix_bookings_status", "bookings", ["status"])
    op.create_index("ix_bookings_is_deleted", "bookings", ["is_deleted"])

    # 6. Availability Blocks Table
    op.create_table(
        "vehicle_availability_blocks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "vehicle_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vehicles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "reason",
            sa.Enum("BOOKING", "MAINTENANCE", "CLEANING", "TRANSIT", "MANUAL_HOLD", name="block_reason_enum"),
            nullable=False,
            server_default="MANUAL_HOLD",
        ),
        sa.Column(
            "booking_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_vehicle_availability_blocks_vehicle_id", "vehicle_availability_blocks", ["vehicle_id"])
    op.create_index("ix_vehicle_availability_blocks_start_time", "vehicle_availability_blocks", ["start_time"])
    op.create_index("ix_vehicle_availability_blocks_end_time", "vehicle_availability_blocks", ["end_time"])
    op.create_index("ix_vehicle_availability_blocks_is_deleted", "vehicle_availability_blocks", ["is_deleted"])

    # 7. Payments Table
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "booking_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("transaction_reference", sa.String(64), nullable=False, unique=True),
        sa.Column("provider", sa.String(32), nullable=False, server_default="stub"),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column(
            "status",
            sa.Enum("PENDING", "PROCESSING", "SUCCEEDED", "FAILED", "REFUNDED", name="payment_status_enum"),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column(
            "payment_method",
            sa.Enum("CREDIT_CARD", "DEBIT_CARD", "DIGITAL_WALLET", "CASH", "BANK_TRANSFER", name="payment_method_enum"),
            nullable=False,
            server_default="CREDIT_CARD",
        ),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_payments_booking_id", "payments", ["booking_id"])
    op.create_index("ix_payments_transaction_reference", "payments", ["transaction_reference"])
    op.create_index("ix_payments_status", "payments", ["status"])
    op.create_index("ix_payments_is_deleted", "payments", ["is_deleted"])

    # 8. Notifications Table
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("recipient", sa.String(255), nullable=False),
        sa.Column(
            "channel",
            sa.Enum("EMAIL", "SMS", "IN_APP", name="notification_channel_enum"),
            nullable=False,
            server_default="EMAIL",
        ),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "SENT", "FAILED", name="notification_status_enum"),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("error_detail", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_recipient", "notifications", ["recipient"])
    op.create_index("ix_notifications_status", "notifications", ["status"])
    op.create_index("ix_notifications_is_deleted", "notifications", ["is_deleted"])

    # 9. Reviews Table
    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "booking_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "vehicle_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vehicles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("customers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_reviews_booking_id", "reviews", ["booking_id"])
    op.create_index("ix_reviews_vehicle_id", "reviews", ["vehicle_id"])
    op.create_index("ix_reviews_customer_id", "reviews", ["customer_id"])
    op.create_index("ix_reviews_rating", "reviews", ["rating"])
    op.create_index("ix_reviews_is_deleted", "reviews", ["is_deleted"])


def downgrade() -> None:
    op.drop_table("reviews")
    op.drop_table("notifications")
    op.drop_table("payments")
    op.drop_table("vehicle_availability_blocks")
    op.drop_table("bookings")
    op.drop_table("customers")
    op.drop_table("vehicles")
    op.drop_table("locations")
    op.drop_table("users")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS notification_status_enum")
    op.execute("DROP TYPE IF EXISTS notification_channel_enum")
    op.execute("DROP TYPE IF EXISTS payment_method_enum")
    op.execute("DROP TYPE IF EXISTS payment_status_enum")
    op.execute("DROP TYPE IF EXISTS block_reason_enum")
    op.execute("DROP TYPE IF EXISTS booking_status_enum")
    op.execute("DROP TYPE IF EXISTS transmission_type_enum")
    op.execute("DROP TYPE IF EXISTS fuel_type_enum")
    op.execute("DROP TYPE IF EXISTS vehicle_status_enum")
    op.execute("DROP TYPE IF EXISTS vehicle_category_enum")
    op.execute("DROP TYPE IF EXISTS user_role_enum")
