# System Architecture & Technical Overview

## 1. Architectural Philosophy & Strategy

The AutoFleet Car Rental Management Platform is architected as an industrial-grade **Modular Monolith**.

### Why Modular Monolith instead of Microservices?
1. **Low Operational Overhead**: Microservices introduce distributed transaction hazards, network latency, distributed tracing overhead, and complex cluster orchestration (Kubernetes). For a single Ubuntu VPS or single-node Docker deployment, a modular monolith eliminates network boundaries between domain calls while enforcing strict in-process code boundaries.
2. **Atomic Consistency**: Core rental workflows (e.g., creating a booking, updating vehicle status, recording payment transactions) participate in a single ACID database transaction without requiring two-phase commits (2PC) or complex Saga orchestrators.
3. **Painless Future Decomposition**: Because each module is independently structured with its own domain entities, schemas, repositories, services, and API controllers, extracting any module (such as Notifications or Payments) into an external microservice in the future is straightforward.

---

## 2. Layered Module Structure

Every backend module conforms strictly to the following 5-tier architecture:

```text
backend/app/modules/<module_name>/
├── __init__.py           # Explicit public exports of the module
├── models.py             # SQLAlchemy 2.x Declarative entities (Base + Mixins)
├── schemas.py            # Pydantic v2 schemas for validation & serialization
├── repository.py         # Data Access Layer (SQLAlchemy queries isolated here)
├── service.py            # Business Logic Layer (validations, transactions, policies)
├── dependencies.py       # FastAPI Dependency Injection factories
└── router.py             # API Controllers (HTTP endpoints mounted under /api/v1)
```

### Architectural Invariants:
1. **Business logic NEVER lives in API routes**: Routes only parse HTTP requests, invoke injected services, and return validated Pydantic schemas wrapped in `ResponseEnvelope[T]`.
2. **Database queries NEVER live in services or routes**: The `BaseRepository` and module-specific repositories encapsulate all SQL and ORM queries.
3. **Cross-module interactions happen via Service interfaces**: If the `Bookings` module needs to check availability, it calls `AvailabilityService` (or uses an event/domain interface), not raw tables belonging to other modules.

---

## 3. The 14 Core Domain Modules

| Module | Primary Responsibility | Key Entities |
| :--- | :--- | :--- |
| **Authentication** | Argon2id password hashing, JWT access tokens, session refresh rotation, account lockout | `UserSession`, `Token` |
| **Users** | Internal system users, RBAC roles (`ADMIN`, `STAFF`, `CUSTOMER`), audit logs | `User`, `AuditLog` |
| **Locations** | Rental branch offices, airport pickup hubs, coordinates | `Location` |
| **Vehicles** | Fleet catalog, VIN, plates, mileage, daily rates, statuses, categories, images | `Vehicle`, `VehicleImage`, `VehicleMaintenanceRecord` |
| **Customers** | Customer profiles, driver license validation, verification status | `Customer` |
| **Bookings** | Reservation lifecycle, rate calculation, half-open interval policies, buffer time | `Booking` |
| **Availability** | Vehicle time-block reservation and maintenance hold conflict check | `VehicleAvailabilityBlock` |
| **Payments** | Razorpay gateway integration, HMAC signature verification, webhooks, receipts, refunds | `PaymentOrder`, `PaymentTransaction`, `PaymentRefund` |
| **WhatsApp** | Meta WhatsApp Cloud API integration, website button, customer chatbot, agent handover | `WhatsAppConversation`, `WhatsAppMessage`, `WhatsAppConfig` |
| **Notifications** | Multichannel delivery (Email, SMS, in-app reminders) | `Notification` |
| **Reviews** | Customer vehicle ratings and review moderation | `Review` |
| **Testimonials** | Canonical customer testimonials and public rating carousel | `Testimonial` |
| **Reports** | Fleet utilization KPIs, revenue analysis, time-series aggregations, CSV export | Executive Overview, Analytics |
| **Settings** | Business operational settings, pricing rules, tax rates, currency configuration | `BusinessSetting` |

---

## 4. Provider-Independent Integration Interfaces

All external third-party integrations are abstracted behind pure Python abstract base classes (`ABC`):

1. **Object Storage (`StorageProvider`)**:
   - Location: `backend/app/interfaces/storage.py`
   - Active Implementation: `MinioStorageProvider` (MinIO S3-compatible)
   - Capabilities: `upload_file`, `download_file`, `delete_file`, `get_presigned_url`, `ping`
   - Future Switch: AWS S3 or Cloudflare R2 requires changing only configuration without altering business logic.

2. **Payments (`PaymentGateway`)**:
   - Location: `backend/app/modules/payments/interfaces.py`
   - Active Implementation: `RazorpayPaymentGateway` (live & test mode support with webhook signature verification)
   - Capabilities: `create_order`, `verify_signature`, `verify_webhook_signature`, `refund_payment`
   - Future Switch: Stripe or Adyen can be plugged in by implementing `PaymentGateway`.

3. **WhatsApp Messaging (`WhatsAppProvider`)**:
   - Location: `backend/app/modules/whatsapp/interfaces.py`
   - Active Implementation: `MetaWhatsAppCloudProvider` (official Meta Cloud API)
   - Capabilities: `send_text_message`, `send_template_message`, `send_interactive_buttons`, `verify_webhook_signature`

4. **Notifications (`NotificationProvider`)**:
   - Location: `backend/app/interfaces/notification.py`
   - Active Implementation: `StubNotificationProvider` / SMTP handler

---

## 5. Technology Stack Summary

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React icons.
- **Backend**: Python 3.11+, FastAPI 0.115, Pydantic v2 Settings.
- **ORM**: SQLAlchemy 2.0 (using `asyncpg` for non-blocking asynchronous database queries).
- **Database**: PostgreSQL 16 Alpine with `btree_gist` extension.
- **Migrations**: Alembic with full async runner support and versioned migration history.
- **Object Storage**: MinIO S3-compatible storage.
- **Reverse Proxy**: Caddy 2.8 with automated Let's Encrypt / ZeroSSL TLS certificate issuance.
- **Testing**: Pytest with `pytest-asyncio` (58/58 tests passing).
