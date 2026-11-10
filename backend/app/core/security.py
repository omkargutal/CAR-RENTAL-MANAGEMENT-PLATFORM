from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Any, Dict, Optional, Union
import argon2
from argon2.exceptions import VerifyMismatchError
import jwt
from passlib.context import CryptContext

from app.core.config import settings

# Primary RFC 9106 Argon2id Password Hasher
argon2_hasher = argon2.PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)

# Passlib fallback context for legacy hashes (e.g. bcrypt)
legacy_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return argon2_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a hashed password.
    Supports native Argon2id hashes, with fallback to bcrypt for legacy compatibility.
    """
    if not hashed_password or not plain_password:
        return False

    # Check if hash is Argon2 format ($argon2...)
    if hashed_password.startswith("$argon2"):
        try:
            return argon2_hasher.verify(hashed_password, plain_password)
        except VerifyMismatchError:
            return False
        except Exception:
            return False

    # Fallback to bcrypt
    try:
        return legacy_pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def hash_token(token: str) -> str:
    """
    Compute a SHA-256 hash of a sensitive token (refresh token, reset token, verification token)
    for secure database storage. Tokens are never stored in plaintext.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_secure_token(nbytes: int = 32) -> str:
    """Generate a high-entropy URL-safe random string."""
    return secrets.token_urlsafe(nbytes)


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """Create a signed JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "sub": str(subject),
        "type": "access",
    }
    if extra_claims:
        to_encode.update(extra_claims)

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a signed JWT access token."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.PyJWTError:
        return None
