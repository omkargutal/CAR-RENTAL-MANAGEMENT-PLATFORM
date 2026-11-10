from abc import ABC, abstractmethod
from typing import BinaryIO, Optional


class StorageProvider(ABC):
    """
    Provider-independent object storage abstraction (MinIO, AWS S3, Local Disk, etc.)
    """

    @abstractmethod
    async def upload_file(
        self,
        file_obj: BinaryIO,
        destination_path: str,
        content_type: str = "application/octet-stream",
        bucket_name: Optional[str] = None,
    ) -> str:
        """Uploads a file and returns its public or reference URL."""
        pass

    @abstractmethod
    async def download_file(
        self, file_path: str, bucket_name: Optional[str] = None
    ) -> bytes:
        """Downloads file content as bytes."""
        pass

    @abstractmethod
    async def delete_file(
        self, file_path: str, bucket_name: Optional[str] = None
    ) -> bool:
        """Deletes a file by its path/key."""
        pass

    @abstractmethod
    async def get_presigned_url(
        self, file_path: str, expires_in_seconds: int = 3600, bucket_name: Optional[str] = None
    ) -> str:
        """Generates a secure presigned access URL."""
        pass

    @abstractmethod
    async def ping(self) -> bool:
        """Verifies connection to storage provider."""
        pass
