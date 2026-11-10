#!/usr/bin/env bash
# ==============================================================================
# AutoFleet Car Rental Platform - Automated PostgreSQL Backup Script
# ==============================================================================
# Usage:
#   ./infrastructure/scripts/backup.sh [BACKUP_DIR]
#
# Cron Example (Run daily at 02:00 UTC):
#   0 2 * * * /path/to/car-rental-platform/infrastructure/scripts/backup.sh >> /var/log/carrental_backup.log 2>&1
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Load environment configuration if available
ENV_FILE="${PROJECT_ROOT}/.env"
if [[ -f "${ENV_FILE}" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "${ENV_FILE}"
    set +a
fi

# Configuration defaults
CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-carrental-postgres}"
PG_USER="${POSTGRES_USER:-carrental_user}"
PG_DB="${POSTGRES_DB:-carrental_db}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

# Default backup destination: host filesystem outside application container
BACKUP_DIR="${1:-${BACKUP_STORAGE_PATH:-${PROJECT_ROOT}/backups}}"
mkdir -p "${BACKUP_DIR}"

TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/carrental_db_${TIMESTAMP}.sql.gz"

echo "=========================================================="
echo " Starting Database Backup: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo " Container   : ${CONTAINER_NAME}"
echo " Database    : ${PG_DB}"
echo " Destination : ${BACKUP_FILE}"
echo "=========================================================="

# 1. Verify Docker and Container status
if ! command -v docker &> /dev/null; then
    echo "ERROR: 'docker' command not found. Ensure Docker is installed and on PATH." >&2
    exit 1
fi

if ! docker ps --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "ERROR: PostgreSQL container '${CONTAINER_NAME}' is not running." >&2
    exit 1
fi

# 2. Execute pg_dump inside container and pipe to gzip on host
echo "Dumping database '${PG_DB}'..."
if docker exec -t "${CONTAINER_NAME}" pg_dump \
    -U "${PG_USER}" \
    -d "${PG_DB}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    | gzip -9 > "${BACKUP_FILE}"; then

    # Restrict permissions for backup security
    chmod 600 "${BACKUP_FILE}"
    FILE_SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
    echo "SUCCESS: Backup completed successfully. Size: ${FILE_SIZE}"
else
    echo "ERROR: pg_dump failed!" >&2
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# 3. Verify gzip integrity
if ! gzip -t "${BACKUP_FILE}"; then
    echo "ERROR: Backup file integrity verification failed!" >&2
    rm -f "${BACKUP_FILE}"
    exit 1
fi
echo "Integrity check: PASSED"

# 4. Prune backups older than retention window
echo "Pruning backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
find "${BACKUP_DIR}" -type f -name "carrental_db_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete || true

echo "Backup process finished at $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "=========================================================="
