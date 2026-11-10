# Database Migration History & Execution Guide

This document describes the complete Alembic migration sequence for the AutoFleet Car Rental Platform, how revisions are chained, and guidelines for creating and applying future migrations.

---

## 1. Migration Overview & Tooling

- **Migration Tool**: Alembic 1.14+
- **Configuration**: `backend/alembic.ini`
- **Environment Script**: `backend/alembic/env.py` (configured with asynchronous SQLAlchemy engine support)
- **Version Directory**: `backend/alembic/versions/`

---

## 2. Revisions History

The migration chain consists of 10 sequential, non-conflicting revisions:

| Revision ID | Name / Description | Revises | Key Changes |
| :--- | :--- | :--- | :--- |
| `0001_initial_baseline` | Initial baseline | `None` | Core tables (`users`, `locations`, `vehicles`, `bookings`, `reviews`) |
| `0002_auth_sessions_and_audit` | Auth sessions & audit | `0001_initial_baseline` | `user_sessions`, `audit_logs`, account lockout fields |
| `0003_vehicle_fleet_expansion` | Fleet expansion | `0002_auth_sessions_and_audit` | `vehicle_categories`, `vehicle_images`, maintenance records |
| `0004_booking_engine` | Booking engine | `0003_vehicle_fleet_expansion` | `tstzrange` rental period, integer cents pricing |
| `0005_business_settings` | Business settings | `0004_booking_engine` | `business_settings` key-value store for operational rules |
| `0006_payment_gateway` | Payment gateway | `0005_business_settings` | `payment_orders`, `payment_transactions`, `payment_refunds` |
| `0007_whatsapp_integration` | WhatsApp integration | `0006_payment_gateway` | `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_configs` |
| `0008_vehicle_display_order` | Fleet display order | `0007_whatsapp_integration` | `sort_order` column on vehicles, initial curated display ranks |
| `0009_testimonials` | Customer testimonials | `0008_vehicle_display_order` | `testimonials` table and canonical testimonial records |
| `0010_drop_overlap_constraint` | Drop overlap constraint | `0009_testimonials` | Drops strict exclusion constraint to allow simultaneous bookings |

---

## 3. Migration Commands

### Check Current Migration Status:
```bash
docker exec carrental-backend alembic current
```

### Apply All Pending Migrations:
```bash
docker exec carrental-backend alembic upgrade head
```

### Roll Back One Revision:
```bash
docker exec carrental-backend alembic downgrade -1
```

### Inspect Migration History:
```bash
docker exec carrental-backend alembic history --verbose
```

---

## 4. Migration Rules for Production

1. **Revision ID Length**: In the PostgreSQL `alembic_version` table, the column `version_num` is typed as `VARCHAR(32)`. Ensure every new migration revision string is **32 characters or fewer**.
2. **Idempotency**: Always wrap schema modifications with `if not exists` or table/column inspection logic to ensure migrations can run cleanly in any staging or production environment.
3. **Never modify applied migrations**: Once a migration is committed and applied in production, never rewrite its file. Always generate a forward migration.
4. **Data Preservation**: Never drop tables or destructive columns without verified backups and soft-deprecation phases.
