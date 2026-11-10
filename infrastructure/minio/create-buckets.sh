#!/bin/sh
set -e

echo "Waiting for MinIO server to become available..."
until /usr/bin/mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"; do
  echo "MinIO not ready yet. Retrying in 2s..."
  sleep 2
done

echo "Ensuring bucket '$S3_BUCKET_NAME' exists..."
/usr/bin/mc mb --ignore-existing "local/$S3_BUCKET_NAME"

echo "Setting public read policy on '$S3_BUCKET_NAME' for public vehicle imagery..."
/usr/bin/mc anonymous set download "local/$S3_BUCKET_NAME" || true

echo "MinIO bucket initialization completed successfully."
exit 0
