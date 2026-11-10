# Local Development Setup Guide

This guide describes how to run and develop the AutoFleet Car Rental Platform locally.

---

## 1. Prerequisites

Before getting started, ensure you have the following installed on your machine:
- **Docker Desktop** (v24.0+) and **Docker Compose** (v2.20+)
- **Node.js** (v18+ or v20+) and **npm** (v9+)
- **Python** (v3.11+)

---

## 2. Environment Configuration

1. Copy the sample environment file to create your local `.env`:
   ```bash
   cp .env.example .env
   ```

2. The default settings in `.env.example` are pre-configured for local containerized development:
   - PostgreSQL port: `5432`
   - MinIO S3 API: `http://localhost:9000` (Console: `http://localhost:9001`)
   - Backend API: `http://localhost:8000`
   - Reverse Proxy: `http://localhost:80`

---

## 3. Starting the Full Stack with Docker Compose

The fastest way to run all 5 services is with Docker Compose:

```bash
docker compose up -d --build
```

### Inspect Container Status:
```bash
docker compose ps
```

You should see 5 healthy containers:
- `carrental-proxy` (Caddy reverse proxy on port 80/443)
- `carrental-frontend` (Nginx serving React frontend)
- `carrental-backend` (FastAPI backend on port 8000)
- `carrental-postgres` (PostgreSQL 16 on port 5432)
- `carrental-minio` (MinIO object storage on port 9000/9001)

### Access Points:
- **Customer Web Application**: [http://localhost](http://localhost)
- **Admin Dashboard**: [http://localhost/admin](http://localhost/admin)
- **WhatsApp Management Console**: [http://localhost/admin/whatsapp](http://localhost/admin/whatsapp)
- **Interactive API Documentation (Swagger)**: [http://localhost/api/v1/docs](http://localhost/api/v1/docs)
- **ReDoc API Documentation**: [http://localhost/api/v1/redoc](http://localhost/api/v1/redoc)
- **Liveness Probe**: [http://localhost/healthz](http://localhost/healthz)
- **Database Readiness Probe**: [http://localhost/readyz](http://localhost/readyz)
- **MinIO Storage Console**: [http://localhost:9001](http://localhost:9001)

---

## 4. Running Backend Directly on Host (Optional)

If you wish to run FastAPI directly with hot-reload while using PostgreSQL and MinIO in Docker:

1. Ensure PostgreSQL and MinIO are running:
   ```bash
   docker compose up -d postgres minio
   ```

2. Create and activate a Python virtual environment:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Run database migrations:
   ```bash
   alembic upgrade head
   ```

4. Start FastAPI server with live reload:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## 5. Running Frontend Directly on Host (Optional)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will be accessible at [http://localhost:5173](http://localhost:5173).

3. To build the production bundle:
   ```bash
   npm run build
   ```

---

## 6. Running Tests

Run the backend Pytest suite inside the running container:
```bash
docker compose exec backend pytest
```

Or on your local machine with an active virtual environment:
```bash
pytest tests/backend/
```
All 58 test suites will execute and report pass/fail status.
