# Coding Standards & Quality Guidelines

This document outlines the architectural conventions, code formatting, type safety standards, and patterns enforced across the Car Rental Platform codebase.

---

## 1. Backend Python Standards

### 1.1 Python Version & Style
- **Version**: Python 3.11+
- **Style Guide**: PEP 8 compliance, with 4 spaces for indentation.
- **Async First**: All FastAPI endpoints, database queries, and external HTTP calls must use `async`/`await`. Avoid blocking I/O calls inside async coroutines.

### 1.2 Type Annotations
- Use strict type hints throughout all services, schemas, and repositories.
- Use Python 3.10+ native pipe syntax for unions (`str | None` or `Union[str, None]`).
- Do not use bare `except:` or untyped `Any` unless interfacing with raw JSON schemas.

### 1.3 Layer Separation
- **Router Layer** (`router.py`):
  - Only accepts request parameters, path variables, query strings, and Pydantic request bodies.
  - Injects services via FastAPI's `Depends()`.
  - Always returns schemas wrapped in `ResponseEnvelope[T]`.
  - Contains **zero** database queries (`select`, `execute`, `commit`).
- **Service Layer** (`service.py`):
  - Enforces domain rules, validation, pricing calculations, status transitions, and authorization checks.
  - Participates in database transactions.
  - Interacts with repositories for persistence.
  - Contains **zero** direct HTTP/FastAPI request parsing.
- **Repository Layer** (`repository.py`):
  - Implements the Data Access Object (DAO) pattern extending `BaseRepository[ModelType]`.
  - Encapsulates all SQLAlchemy `select`, `insert`, `update`, `delete`, and joins.
  - Returns SQLAlchemy ORM models or scalar values.

### 1.4 Logging
- Use the structured logger from `app.core.logging import logger`.
- Do not use `print()` statements anywhere in backend code.
- Avoid logging plaintext passwords, JWTs, secret keys, or credit card numbers.

---

## 2. Frontend React + TypeScript Standards

### 2.1 Framework & Build
- **Framework**: React 18 with TypeScript in strict mode.
- **Build Tool**: Vite (`vite build` via `tsc -b && vite build`).
- **Styling**: Tailwind CSS with consistent spacing, colors, and responsive utilities.

### 2.2 Component Standards
- **Pure Functions**: Write functional components with standard React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`).
- **Props Typing**: Always define explicit TypeScript interfaces for component props.
- **Visual Stability**: Never rewrite components or alter CSS classes merely for aesthetic preference during cleanup or bugfix tasks.
- **Keys in Lists**: Always provide unique, stable keys (such as entity IDs) for mapped JSX elements.

### 2.3 Error Handling
- Use `try/catch` or `.catch()` with graceful fallback states (e.g., fallback lists or alerts) so the UI remains operable if an API request fails.
- Avoid noisy `console.log()` calls in production code. Use `console.warn()` or `console.error()` only when actionable diagnostics are required.

---

## 3. Database Conventions

- **Primary Keys**: Universally Unique Identifiers (`UUIDv4`) generated via `UUIDPrimaryKeyMixin`.
- **Soft Deletion**: All major entities inherit `SoftDeleteMixin` providing `is_deleted` and `deleted_at`. Real physical deletions are avoided to preserve audit trails.
- **Auditing**: All database entities track `created_at` and `updated_at` timezone-aware UTC timestamps.
- **Migrations**: Every schema modification must be executed through a versioned Alembic migration file under `backend/alembic/versions/`.
