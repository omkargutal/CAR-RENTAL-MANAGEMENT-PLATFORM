from contextlib import asynccontextmanager
import time
import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.database import check_database_connection
from app.core.exceptions import register_exception_handlers
from app.core.logging import logger, setup_logging
from app.core.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup lifecycle
    setup_logging()
    logger.info(
        f"Starting {settings.PROJECT_NAME} in [{settings.ENVIRONMENT}] mode..."
    )
    yield
    # Shutdown lifecycle
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        description="Production-Ready Modular Monolith Car Rental Management Platform API",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
        lifespan=lifespan,
    )

    # CORS Middleware
    if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # API Rate Limiting Middleware
    app.add_middleware(RateLimitMiddleware)

    # Request ID and Timing Middleware
    @app.middleware("http")
    async def add_process_time_and_request_id(request: Request, call_next):
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = time.perf_counter() - start_time
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        return response

    # Global Exception Handlers
    register_exception_handlers(app)

    # Kubernetes / Container Liveness & Readiness Probes
    @app.get("/healthz", tags=["Probes"])
    async def liveness():
        return {"status": "ok", "app": settings.PROJECT_NAME}

    @app.get("/readyz", tags=["Probes"])
    async def readiness():
        db_healthy = await check_database_connection()
        if db_healthy:
            return {"status": "ready", "database": "connected"}
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": "disconnected"},
        )

    # Mount versioned API routes under /api/v1
    app.include_router(api_v1_router, prefix=settings.API_V1_STR)

    return app


app = create_app()
