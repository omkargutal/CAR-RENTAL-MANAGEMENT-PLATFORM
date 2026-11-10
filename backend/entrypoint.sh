#!/usr/bin/env bash
set -e

echo "=== Car Rental Platform Backend Startup ==="
echo "Running database migrations with Alembic..."

# Attempt migrations with retry loop while DB starts up
MAX_RETRIES=30
RETRY_COUNT=0

until alembic upgrade head || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  echo "Database not ready yet or migration pending. Waiting 2 seconds... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT+1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "Error: Failed to apply database migrations after $MAX_RETRIES attempts."
  exit 1
fi

echo "Database migrations applied successfully."

echo "Starting Uvicorn server on 0.0.0.0:8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'
