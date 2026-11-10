# Production Deployment Guide: Ubuntu VPS to Any Docker Host

## 1. Target Architecture & Environment

The platform is engineered to deploy cleanly on:
- A single **Ubuntu 22.04 / 24.04 LTS VPS** (e.g. Hetzner, DigitalOcean, Linode, AWS EC2, or OVH).
- Any standard Docker Compose-compatible hosting provider.
- Recommended resources: Minimum 2 vCPU, 2-4 GB RAM, 30 GB SSD.

No Kubernetes or overly complex orchestrator is required.

---

## 2. Server Prerequisites

On a fresh Ubuntu VPS instance:

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# 4. Verify installation
docker --version
docker compose version
```

---

## 3. Production Deployment Steps

```bash
# 1. Clone repository onto the server
git clone <your-repo-url> /opt/car-rental-platform
cd /opt/car-rental-platform

# 2. Configure production environment secrets
cp .env.example .env
nano .env

# Mandatory production changes in .env:
# - Set ENVIRONMENT=production
# - Set DEBUG=false
# - Set SECRET_KEY to a secure 64-char random string (openssl rand -hex 32)
# - Set strong POSTGRES_PASSWORD
# - Set strong S3_SECRET_KEY
# - Set DOMAIN to your public domain name (e.g. rental.yourdomain.com)
# - Set CADDY_EMAIL to your administrator email for Let's Encrypt TLS
# - Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
# - Set WHATSAPP_* credentials from Meta Developer Portal

# 3. Launch application stack in hardened production mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 4. Inspect container health status
docker compose ps
```

In production mode:
- `postgres`, `minio`, `backend`, and `frontend` have **no host ports exposed**.
- All internal communication is restricted to the isolated private bridge network `carrental_network`.
- Only `proxy` (Caddy) exposes ports `80` and `443` to the outside world.

---

## 4. Reverse Proxy & Automatic SSL Configuration

Caddy serves as the edge perimeter proxy:
- Port 80 automatically redirects HTTP traffic to HTTPS (port 443).
- Caddy automatically obtains and renews trusted TLS certificates from Let's Encrypt / ZeroSSL.
- Production-grade security headers (HSTS, CSP, X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, Permissions-Policy) are injected automatically.

To inspect Caddy logs:
```bash
docker compose logs -f proxy
```

---

## 5. Automated Health Probes & Verification

Verify that all services are operational:
```bash
# 1. Check system liveness
curl -I https://rental.yourdomain.com/healthz
# Expected: HTTP/1.1 200 OK

# 2. Check database connection readiness
curl -s https://rental.yourdomain.com/readyz
# Expected: {"status":"ready","database":"connected"}

# 3. Run container test suite
docker compose exec backend pytest
```
