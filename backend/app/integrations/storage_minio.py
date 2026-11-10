import asyncio
import io
from typing import BinaryIO, Optional
from urllib.parse import urlparse
from app.core.config import settings
from app.core.logging import logger
from app.interfaces.storage import StorageProvider

try:
    from minio import Minio
    from minio.error import S3Error

    HAS_MINIO = True
except ImportError:
    HAS_MINIO = False


class MinioStorageProvider(StorageProvider):
    def __init__(self) -> None:
        if not HAS_MINIO:
            logger.warning("MinIO python library not installed, storage will run in stub mode.")
            self.client = None
            return

        parsed = urlparse(settings.S3_ENDPOINT)
        host = parsed.netloc or parsed.path
        secure = settings.S3_USE_SSL or (parsed.scheme == "https")

        try:
            self.client = Minio(
                endpoint=host,
                access_key=settings.S3_ACCESS_KEY,
                secret_key=settings.S3_SECRET_KEY,
                secure=secure,
                region=settings.S3_REGION,
            )
            self.default_bucket = settings.S3_BUCKET_NAME
        except Exception as e:
            logger.error(f"Failed to initialize MinIO client: {e}")
            self.client = None

    async def ensure_bucket_exists(self, bucket_name: Optional[str] = None) -> None:
        bucket = bucket_name or self.default_bucket
        if not self.client:
            return
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._sync_ensure_bucket, bucket)

    def _sync_ensure_bucket(self, bucket: str) -> None:
        try:
            if not self.client.bucket_exists(bucket):
                self.client.make_bucket(bucket)
                logger.info(f"Created MinIO bucket: {bucket}")
        except Exception as e:
            logger.warning(f"Could not check/create bucket {bucket}: {e}")

    async def upload_file(
        self,
        file_obj: BinaryIO,
        destination_path: str,
        content_type: str = "application/octet-stream",
        bucket_name: Optional[str] = None,
    ) -> str:
        bucket = bucket_name or self.default_bucket
        if not self.client:
            logger.info(f"[StubStorage] Uploaded {destination_path} to bucket {bucket}")
            return f"{settings.S3_PUBLIC_ENDPOINT}/{bucket}/{destination_path}"

        await self.ensure_bucket_exists(bucket)

        file_obj.seek(0, io.SEEK_END)
        size = file_obj.tell()
        file_obj.seek(0)

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self.client.put_object(
                bucket,
                destination_path,
                file_obj,
                length=size,
                content_type=content_type,
            ),
        )
        return f"{settings.S3_PUBLIC_ENDPOINT}/{bucket}/{destination_path}"

    async def download_file(
        self, file_path: str, bucket_name: Optional[str] = None
    ) -> bytes:
        bucket = bucket_name or self.default_bucket
        if not self.client:
            return b"mock file content"

        loop = asyncio.get_event_loop()

        def _get():
            response = self.client.get_object(bucket, file_path)
            data = response.read()
            response.close()
            response.release_conn()
            return data

        return await loop.run_in_executor(None, _get)

    async def delete_file(
        self, file_path: str, bucket_name: Optional[str] = None
    ) -> bool:
        bucket = bucket_name or self.default_bucket
        if not self.client:
            return True

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, lambda: self.client.remove_object(bucket, file_path)
        )
        return True

    async def get_presigned_url(
        self, file_path: str, expires_in_seconds: int = 3600, bucket_name: Optional[str] = None
    ) -> str:
        bucket = bucket_name or self.default_bucket
        if not self.client:
            return f"{settings.S3_PUBLIC_ENDPOINT}/{bucket}/{file_path}?token=mock_presigned"

        from datetime import timedelta

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.client.presigned_get_object(
                bucket, file_path, expires=timedelta(seconds=expires_in_seconds)
            ),
        )

    async def ping(self) -> bool:
        if not self.client:
            return True
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None, lambda: self.client.list_buckets() is not None
            )
        except Exception as e:
            logger.warning(f"MinIO storage ping check failed: {e}")
            return False


# Singleton factory helper for dependency injection
_storage_instance: Optional[StorageProvider] = None


def get_storage_provider() -> StorageProvider:
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = MinioStorageProvider()
    return _storage_instance
