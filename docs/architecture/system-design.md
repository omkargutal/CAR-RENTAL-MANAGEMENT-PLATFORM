# System Design & Security Architecture

## 1. Security Architecture & Threat Model

The platform enforces a Defense-in-Depth security model covering authentication, network boundaries, input validation, rate limiting, and data encryption.

### 1.1 Password Security & Account Protection
- **Algorithm**: RFC 9106 Argon2id via `passlib`, configured with memory cost = 64 MB (`65536`), time cost = 3 iterations, and parallelism = 4.
- **Legacy Fallback**: Bcrypt verification fallback maintained for backwards compatibility.
- **Plaintext Passwords**: Never persisted to disk or logged.
- **Account Lockout**: 5 consecutive failed login attempts trigger an automatic 15-minute account lockout (`locked_until`). Successful authentication resets the counter.

### 1.2 Dual-Token Session Architecture
- **Access Tokens**: Short-lived (15 minutes default) signed HS256 JWTs carrying user ID, email, and role.
- **Refresh Tokens**: High-entropy cryptographically secure random tokens (`secrets.token_urlsafe(32)`).
- **Storage**: Only the SHA-256 hash of the refresh token is stored in the PostgreSQL `user_sessions` table.
- **Automatic Token Rotation**: On every `/api/v1/auth/refresh` call, the existing session is invalidated and a fresh refresh token is issued.
- **HttpOnly Secure Cookies**: Refresh tokens are transmitted and received via `HttpOnly`, `SameSite=Lax` cookies (with JSON payload fallback).

### 1.3 Role-Based Access Control (RBAC) Matrix

| Capability / Resource | Customer | Staff | Admin |
|:---|:---:|:---:|:---:|
| Search catalog & explore fleet | ✅ | ✅ | ✅ |
| Create booking & initiate payment | ✅ | ✅ | ✅ |
| Manage own profile & view own bookings | ✅ | ✅ | ✅ |
| Upload driver's license documents | ✅ | ✅ | ✅ |
| Update vehicle status & maintenance records | ❌ | ✅ | ✅ |
| Approve or manage customer bookings | ❌ | ✅ | ✅ |
| Manage vehicle fleet catalog & pricing | ❌ | ❌ | ✅ |
| Full payment reconciliation & refunds | ❌ | ❌ | ✅ |
| WhatsApp live agent console & broadcast | ❌ | ❌ | ✅ |
| Administrative audit log inspection | ❌ | ❌ | ✅ |
| User role promotion & deactivation | ❌ | ❌ | ✅ |

### 1.4 Network & Perimeter Security
- **Isolated Private Network**: All backend, database, and storage containers communicate over an isolated Docker bridge network (`carrental_network`).
- **Zero Exposed Internal Ports**: In production mode (`docker-compose.prod.yml`), PostgreSQL (`5432`), MinIO (`9000-9001`), and FastAPI (`8000`) have zero host ports mapped.
- **Edge Reverse Proxy**: Caddy exposes only ports 80 (HTTP redirect) and 443 (HTTPS) to the public internet.
- **HTTP Security Headers**: Injected at the reverse proxy edge:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Permissions-Policy: geolocation=(self), camera=(), microphone=()`
  - `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.razorpay.com;`

---

## 2. API Contract & Response Envelope

All API endpoints return JSON conforming to the standardized `ResponseEnvelope[T]` format:

### Success Response Contract
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully.",
  "meta": {
    "page": 1,
    "total": 50
  }
}
```

### Error Response Contract
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Vehicle with id '...' does not exist.",
    "details": null
  }
}
```

Stack traces and database internals are never exposed in production error responses.

---

## 3. Rate Limiting Strategy

An in-memory sliding-window rate limiter middleware is active on all endpoints:
- **Default limit**: 120 requests per minute per IP address.
- **Authentication endpoints** (`/api/v1/auth/login`, `/register`, `/forgot-password`): 20 requests per minute per IP address.
- **Header inspection**: Transparently inspects `X-Forwarded-For` and `X-Real-IP` set by Caddy.
