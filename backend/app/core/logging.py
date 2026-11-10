import logging
import sys
from typing import Any, Dict
from app.core.config import settings

try:
    try:
        from pythonjsonlogger.json import JsonFormatter
    except ImportError:
        from pythonjsonlogger.jsonlogger import JsonFormatter
    HAS_JSON_LOGGER = True
except ImportError:
    HAS_JSON_LOGGER = False
    JsonFormatter = None  # type: ignore


class CustomJsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
            "environment": settings.ENVIRONMENT,
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        if hasattr(record, "module_name"):
            log_entry["module"] = record.module_name
        return str(log_entry)


def setup_logging() -> None:
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.LOG_LEVEL)

    # Remove existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler(sys.stdout)

    if settings.ENVIRONMENT == "production" and HAS_JSON_LOGGER and JsonFormatter:
        formatter = JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s"
        )
        console_handler.setFormatter(formatter)
    elif settings.ENVIRONMENT == "production":
        console_handler.setFormatter(CustomJsonFormatter())
    else:
        # Development readable format with color-friendly indicators
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        console_handler.setFormatter(formatter)

    root_logger.addHandler(console_handler)

    # Silence overly verbose third-party loggers in dev
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.DEBUG else logging.WARNING
    )


logger = logging.getLogger("carrental")
