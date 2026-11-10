# Operational Maintenance & Troubleshooting Guide

This guide provides troubleshooting solutions for operational issues that may arise during development, testing, or production deployment.

---

## 1. Container Diagnostics

### View Status of All Services:
```bash
docker compose ps
```

### Inspect Container Logs:
```bash
# View backend logs:
docker compose logs -f backend

# View reverse proxy logs:
docker compose logs -f proxy

# View database logs:
docker compose logs -f postgres
```

---

## 2. Common Issues & Solutions

### Issue 2.1: Alembic Multiple Head Revisions or Revision Length Error
- **Symptom**: `ERROR [alembic.util.messaging] Multiple head revisions are present` or `value too long for type character varying(32)`.
- **Cause**:
  1. Multiple unmerged migration branches exist in `backend/alembic/versions/`.
  2. A migration revision ID exceeds 32 characters (the column size of `alembic_version.version_num` in PostgreSQL is `VARCHAR(32)`).
- **Resolution**:
  1. Inspect `alembic heads`:
     ```bash
     docker exec carrental-backend alembic heads
     ```
  2. Ensure revision IDs are <= 32 characters long.
  3. Ensure each migration's `down_revision` points to the immediately preceding revision.

### Issue 2.2: Port Conflicts on Host (e.g., Port 80, 5432, or 8000 already in use)
- **Symptom**: `Bind for 0.0.0.0:80 failed: port is already allocated`.
- **Cause**: Another local service (Apache, Nginx, local PostgreSQL) is occupying the requested port.
- **Resolution**:
  - Identify the occupying process:
    ```bash
    sudo lsof -i :80
    sudo lsof -i :5432
    ```
  - Stop the conflicting service, or adjust the host port mapping in `docker-compose.yml`.

### Issue 2.3: Database Connection Refused on Startup
- **Symptom**: Backend container logs show `asyncpg.exceptions.CannotConnectNowError` or connection timeout.
- **Cause**: Backend attempted to query the database before PostgreSQL completed initialization.
- **Resolution**:
  - The stack includes a `healthcheck` on the `postgres` container and `depends_on: postgres: condition: service_healthy` on the backend.
  - If manual startup is used, wait for PostgreSQL health probe:
    ```bash
    docker exec carrental-postgres pg_isready -U carrental_user -d carrental_db
    ```

### Issue 2.4: HTTPS Certificate Issuance Issues with Caddy
- **Symptom**: Browser reports SSL certificate warning or `ERR_SSL_PROTOCOL_ERROR`.
- **Cause**: Public DNS A-record does not point to the server's public IP, or ports 80/443 are blocked by host firewall.
- **Resolution**:
  - Verify inbound firewall rules:
    ```bash
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    ```
  - Verify DNS resolution:
    ```bash
    dig +short rental.yourdomain.com
    ```
  - Inspect Caddy logs:
    ```bash
    docker compose logs proxy | grep -i tls
    ```

---

## 3. Database Health & Maintenance Commands

### Check PostgreSQL Connection:
```bash
docker exec carrental-postgres pg_isready -U carrental_user -d carrental_db
```

### Access PostgreSQL Interactive Shell (`psql`):
```bash
docker exec -it carrental-postgres psql -U carrental_user -d carrental_db
```

### Check Active PostgreSQL Locks & Connections:
```sql
SELECT pid, usename, client_addr, state, query 
FROM pg_stat_activity 
WHERE datname = 'carrental_db';
```
