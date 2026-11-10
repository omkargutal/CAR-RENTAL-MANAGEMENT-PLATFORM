from collections import defaultdict
from datetime import datetime, timezone
import time
from typing import Callable, Dict, List, Optional, Tuple
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.logging import logger


class InMemoryRateLimiter:
    """
    Sliding window in-memory rate limiter.
    Tracks timestamps of requests per client key and endpoint group.
    """

    def __init__(self):
        # Key: (client_key, endpoint_group) -> list of epoch timestamps
        self._history: Dict[Tuple[str, str], List[float]] = defaultdict(list)
        self._last_cleanup = time.time()

    def _cleanup_old_entries(self, current_time: float, window_seconds: float = 60.0):
        """Periodically cleans up expired timestamps to avoid memory growth."""
        if current_time - self._last_cleanup < 30.0:
            return
        
        keys_to_delete = []
        for key, timestamps in self._history.items():
            valid_stamps = [t for t in timestamps if current_time - t <= window_seconds]
            if not valid_stamps:
                keys_to_delete.append(key)
            else:
                self._history[key] = valid_stamps

        for k in keys_to_delete:
            del self._history[k]
        self._last_cleanup = current_time

    def is_allowed(
        self,
        client_key: str,
        group: str,
        limit: int,
        window_seconds: float = 60.0,
    ) -> Tuple[bool, int, int]:
        """
        Check if request is allowed within the sliding window.
        Returns: (allowed, remaining_quota, reset_seconds)
        """
        now = time.time()
        self._cleanup_old_entries(now, window_seconds)

        key = (client_key, group)
        timestamps = self._history[key]
        
        # Keep only timestamps within window
        valid_timestamps = [t for t in timestamps if now - t <= window_seconds]
        self._history[key] = valid_timestamps

        count = len(valid_timestamps)
        if count >= limit:
            oldest = valid_timestamps[0]
            reset_seconds = max(1, int(window_seconds - (now - oldest)))
            return False, 0, reset_seconds

        valid_timestamps.append(now)
        remaining = max(0, limit - len(valid_timestamps))
        reset_seconds = int(window_seconds)
        return True, remaining, reset_seconds


rate_limiter = InMemoryRateLimiter()


def get_client_ip(request: Request) -> str:
    """Extract real client IP taking reverse proxy headers into account."""
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware applying tiered rate limits:
    - Sensitive endpoints (auth login, register, password reset): strict limit
    - Standard API endpoints: standard limit
    - Probes and webhooks: exempt
    """

    EXEMPT_PATHS = {
        "/healthz",
        "/readyz",
        f"{settings.API_V1_STR}/docs",
        f"{settings.API_V1_STR}/redoc",
        f"{settings.API_V1_STR}/openapi.json",
        f"{settings.API_V1_STR}/payments/webhook",
        f"{settings.API_V1_STR}/payments/webhooks/razorpay",
        f"{settings.API_V1_STR}/whatsapp/webhook",
    }

    AUTH_PREFIXES = (
        f"{settings.API_V1_STR}/auth/login",
        f"{settings.API_V1_STR}/auth/register",
        f"{settings.API_V1_STR}/auth/forgot-password",
        f"{settings.API_V1_STR}/auth/reset-password",
    )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check if rate limiting is enabled
        if not getattr(settings, "RATE_LIMIT_ENABLED", True):
            return await call_next(request)

        path = request.url.path

        # Exempt probe and webhook endpoints
        if path in self.EXEMPT_PATHS:
            return await call_next(request)

        client_ip = get_client_ip(request)

        # Direct unproxied internal loopback traffic is exempt (in prod, real traffic has X-Forwarded-For from Caddy)
        if client_ip in ("127.0.0.1", "::1", "testclient") and not request.headers.get("X-Forwarded-For"):
            return await call_next(request)

        # Determine limit and group based on endpoint sensitivity
        if any(path.startswith(prefix) for prefix in self.AUTH_PREFIXES):
            group = "auth"
            limit = getattr(settings, "RATE_LIMIT_AUTH_PER_MINUTE", 20)
        else:
            group = "general"
            limit = getattr(settings, "RATE_LIMIT_DEFAULT_PER_MINUTE", 120)

        allowed, remaining, reset_seconds = rate_limiter.is_allowed(
            client_key=client_ip,
            group=group,
            limit=limit,
            window_seconds=60.0,
        )

        if not allowed:
            logger.warning(
                f"Rate limit exceeded for IP {client_ip} on path {path} (group: {group})"
            )
            response = JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "detail": "Rate limit exceeded. Please wait before retrying.",
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "retry_after_seconds": reset_seconds,
                },
            )
            response.headers["Retry-After"] = str(reset_seconds)
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = "0"
            response.headers["X-RateLimit-Reset"] = str(reset_seconds)
            return response

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_seconds)
        return response
