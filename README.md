# AutoFleet Pro - Enterprise Car Rental & Mobility Platform

A production-ready, industrial-grade **Modular Monolith** platform for automotive fleet rental operations, trip dispatching, dynamic pricing, payment processing, omni-channel customer support, and administrative management.

Engineered for seamless deployment on a single Ubuntu VPS using Docker Compose and portable to any Docker-compatible hosting environment.

---

## 1. Project Overview & Business Description

**AutoFleet Pro** provides end-to-end car rental, cab booking, and corporate mobility management. The platform features:

- **Customer-Facing Portal**:
  - Fleet discovery with categories (Sedan, SUV, Van, Luxury) and live vehicle specs.
  - Multi-journey booking engine: Local Daily rentals, Outstation One-Way, Outstation Round Trips, and Airport Transfers.
  - Automated distance-based fare calculation with configurable per-kilometer rates.
  - Razorpay payment checkout integration with HMAC SHA256 signature verification.
  - Real-time customer booking lookup and digital receipts.
  - Floating WhatsApp Business click-to-chat with pre-filled inquiries and 24/7 conversational support.
- **Operations & Administration Console**:
  - Centralized fleet inventory management (pricing, categories, statuses, vehicle sorting).
  - Booking dispatch, scheduling, and customer management.
  - Razorpay transaction reconciliation, refunds, and financial reporting.
  - Live WhatsApp conversation viewer, message history, and audit logs.
  - RBAC role enforcement (`ADMIN`, `STAFF`, `CUSTOMER`) with audit trails.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React |
| **Backend** | Python 3.11+, FastAPI 0.115, Pydantic v2 Settings |
| **Database & ORM** | PostgreSQL 16 Alpine, SQLAlchemy 2.0 (`asyncpg` driver), Alembic 1.14+ |
| **Object Storage** | MinIO S3-compatible storage (for vehicle images & customer documents) |
| **Reverse Proxy & TLS** | Caddy 2.8 with automatic Let's Encrypt / ZeroSSL certificate management |
| **Testing** | Pytest 8.x with `pytest-asyncio` (58 unit, integration, and security tests) |
| **Security** | Argon2id password hashing, sliding-window rate limiting, HttpOnly cookies |

---

## 3. Architecture Overview

The backend conforms strictly to a **Modular Monolith** architectural pattern. Each of the 14 domain modules encapsulates its own models, schemas, repositories, services, and routers:

```text
backend/app/modules/<module_name>/
├── __init__.py           # Explicit public module exports
├── models.py             # SQLAlchemy 2.x Declarative models
├── schemas.py            # Pydantic v2 validation & response schemas
├── repository.py         # Data Access Layer (encapsulating all queries)
├── service.py            # Business Logic Layer (validations, transactions, policies)
├── dependencies.py       # FastAPI dependency injection factories
└── router.py             # API Controllers (mounted under /api/v1)
```

For complete architecture details, see [docs/architecture/overview.md](docs/architecture/overview.md) and [docs/architecture/system-design.md](docs/architecture/system-design.md).

---

## 4. Repository Structure

```text
├── backend/
│   ├── alembic/                  # Database migration environment & 10 versioned revisions
│   ├── app/
│   │   ├── api/v1/               # Aggregated REST API routers & health probes
│   │   ├── common/               # Base Declarative models, Mixins, Generic Repositories & Services
│   │   ├── core/                 # Central Pydantic config, DB engine, security, rate limiting
│   │   ├── interfaces/           # Provider Interfaces (Storage, Payment, WhatsApp, Notifications)
│   │   ├── integrations/         # Integrations (MinIO S3, Razorpay, Meta WhatsApp Cloud API)
│   │   └── modules/              # 14 Independently Organized Business Modules
│   ├── Dockerfile
│   ├── entrypoint.sh             # Startup migration runner & Uvicorn launcher
│   ├── pyproject.toml            # Backend dependencies and Pytest configuration
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/           # Navbar, Footer, SearchWidget, BookingModal, WhatsApp button
│   │   ├── pages/                # Fleet catalog, Services, Corporate, Dashboards, Admin consoles
│   │   └── services/             # API client, Auth, Fleet, Booking, Payments, WhatsApp services
│   ├── Dockerfile                # Multi-stage production build (Node 22 -> Nginx)
│   ├── package.json
│   └── vite.config.ts
├── infrastructure/
│   ├── caddy/
│   │   └── Caddyfile             # Production reverse proxy routing & security headers
│   └── scripts/
│       ├── backup.sh             # Automated PostgreSQL backup script with gzip & retention
│       └── restore.sh            # Automated database restoration script
├── docs/                         # Structured technical documentation
│   ├── architecture/             # System architecture & threat model
│   ├── development/              # Local setup & coding standards
│   ├── database/                 # Schema ERD & migration history
│   ├── integrations/             # Razorpay payments & Meta WhatsApp API
│   ├── deployment/               # Ubuntu VPS production setup & disaster recovery
│   └── maintenance/              # Operational diagnostics & troubleshooting
├── tests/
│   └── backend/                  # Pytest test suite (58 tests passing)
├── docker-compose.yml            # Container orchestration for local development
├── docker-compose.prod.yml       # Production-hardened compose override
├── .env.example                  # Central environment template
└── README.md
```

---

## 5. Prerequisites

- **Docker Desktop** (v24.0+) and **Docker Compose** (v2.20+)
- **Node.js** (v18+ or v20+) and **npm** (v9+)
- **Python** (v3.11+)

---

## 6. Local Development Setup

### Step 1: Environment Configuration
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```
The default values in `.env.example` are pre-configured for local containerized development out of the box.

### Step 2: Start Full Stack with Docker Compose
```bash
docker compose up -d --build
```

### Step 3: Verify Running Services
```bash
docker compose ps
```
All 5 containers should be in a healthy state:
- `carrental-proxy` (Caddy reverse proxy on port 80/443)
- `carrental-frontend` (Nginx serving React frontend)
- `carrental-backend` (FastAPI backend on port 8000)
- `carrental-postgres` (PostgreSQL 16 on port 5432)
- `carrental-minio` (MinIO object storage on port 9000/9001)

### Access Endpoints:
- **Customer Web Application**: [http://localhost](http://localhost)
- **Admin Dashboard**: [http://localhost/admin](http://localhost/admin)
- **WhatsApp Management Console**: [http://localhost/admin/whatsapp](http://localhost/admin/whatsapp)
- **Interactive API Documentation (Swagger)**: [http://localhost/api/v1/docs](http://localhost/api/v1/docs)
- **ReDoc API Documentation**: [http://localhost/api/v1/redoc](http://localhost/api/v1/redoc)
- **Liveness Probe**: [http://localhost/healthz](http://localhost/healthz)
- **Readiness Probe**: [http://localhost/readyz](http://localhost/readyz)
- **MinIO Storage Console**: [http://localhost:9001](http://localhost:9001)

---

## 7. Manual Startup (Host Environment)

If developing outside Docker containers:

### Backend Startup:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Startup:
```bash
cd frontend
npm install
npm run dev
```

---

## 8. Database Migrations

Database schema versions are managed via Alembic:

```bash
# Check current database revision:
docker exec carrental-backend alembic current

# Apply all pending migrations to head:
docker exec carrental-backend alembic upgrade head

# Roll back the most recent migration:
docker exec carrental-backend alembic downgrade -1
```

For full details on the 10 versioned revisions, refer to [docs/database/migrations.md](docs/database/migrations.md).

---

## 9. Testing & Quality Gates

Run the backend Pytest test suite inside the container:
```bash
docker exec carrental-backend pytest
```

Build the frontend bundle to verify TypeScript compilation:
```bash
cd frontend
npm run build
```

Current Test Status: **58 / 58 Passed (100%)**.

---

## 10. Production Deployment Overview

To deploy to an Ubuntu 22.04 / 24.04 VPS:

1. Clone the repository and configure production secrets in `.env`:
   - Set `ENVIRONMENT=production`
   - Set `DEBUG=false`
   - Generate `SECRET_KEY` using `openssl rand -hex 32`
   - Set strong passwords for `POSTGRES_PASSWORD` and `S3_SECRET_KEY`
   - Set `DOMAIN` (e.g. `rental.yourdomain.com`) and `CADDY_EMAIL`
   - Provide Razorpay and Meta WhatsApp credentials
2. Launch with production compose override:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```
3. In production mode, all internal ports (Postgres, MinIO, FastAPI) are closed to the host internet; only Caddy (ports 80 and 443) is exposed with automated TLS.

For complete production server deployment instructions, see [docs/deployment/production-setup.md](docs/deployment/production-setup.md).

---

## 11. Automated Backup & Disaster Recovery

- **On-Demand Backup**:
  ```bash
  ./infrastructure/scripts/backup.sh ./backups
  ```
- **Automated Daily Cron (02:00 UTC)**:
  ```cron
  0 2 * * * /opt/car-rental-platform/infrastructure/scripts/backup.sh /var/backups/carrental >> /var/log/carrental_backup.log 2>&1
  ```
- **Disaster Recovery Restore**:
  ```bash
  ./infrastructure/scripts/restore.sh ./backups/carrental_db_<timestamp>.sql.gz
  ```

For complete restoration procedures, see [docs/deployment/backup-restore.md](docs/deployment/backup-restore.md).

---

## 12. Troubleshooting & Diagnostics

- **Inspect Backend Logs**: `docker compose logs -f backend`
- **Inspect Reverse Proxy Logs**: `docker compose logs -f proxy`
- **Check Database Readiness**: `curl -s http://localhost/readyz`
- **Database Shell**: `docker exec -it carrental-postgres psql -U carrental_user -d carrental_db`

For detailed diagnostics, see [docs/maintenance/troubleshooting.md](docs/maintenance/troubleshooting.md).
