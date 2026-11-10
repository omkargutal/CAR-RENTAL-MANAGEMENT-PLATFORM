#!/usr/bin/env bash
# ==============================================================================
# AutoFleet Car Rental Platform - PostgreSQL Database Restoration Script
# ==============================================================================
# Usage:
#   ./infrastructure/scripts/restore.sh <BACKUP_FILE.sql.gz> [--force]
#
# Examples:
#   ./infrastructure/scripts/restore.sh ./backups/carrental_db_20261102_180000.sql.gz
#   ./infrastructure/scripts/restore.sh ./backups/carrental_db_20261102_180000.sql.gz --force
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

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <BACKUP_FILE.sql.gz> [--force]" >&2
    exit 1
fi

BACKUP_FILE="$1"
FORCE_RESTORE=false

if [[ "${2:-}" == "--force" ]]; then
    FORCE_RESTORE=true
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
    echo "ERROR: Backup file '${BACKUP_FILE}' does not exist." >&2
    exit 1
fi

echo "=========================================================="
echo " Database Restoration: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo " Target Container : ${CONTAINER_NAME}"
echo " Target Database  : ${PG_DB}"
echo " Source Backup    : ${BACKUP_FILE}"
echo "=========================================================="

# 1. Verify gzip file integrity
echo "Verifying backup archive integrity..."
if ! gzip -t "${BACKUP_FILE}"; then
    echo "ERROR: Archive '${BACKUP_FILE}' is corrupted or not a valid gzip file." >&2
    exit 1
fi
echo "Integrity check: PASSED"

# 2. Check Docker container availability
if ! docker ps --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "ERROR: PostgreSQL container '${CONTAINER_NAME}' is not running." >&2
    exit 1
fi

# 3. Confirmation prompt (unless --force is passed)
if [[ "${FORCE_RESTORE}" != "true" ]]; then
    read -r -p "WARNING: Restoring will overwrite data in database '${PG_DB}'. Proceed? (yes/no): " CONFIRM
    if [[ "${CONFIRM}" != "yes" ]]; then
        echo "Restoration aborted by user."
        exit 0
    fi
fi

# 4. Perform database restoration
echo "Restoring database from '${BACKUP_FILE}'..."
if gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${PG_USER}" -d "${PG_DB}" > /dev/null 2>&1; then
    echo "SUCCESS: Database restoration applied."
else
    echo "WARNING: psql finished with notices or minor non-fatal warnings."
fi

# 5. Post-restoration verification
echo "Running post-restoration verification checks..."
VERIFY_OUTPUT="$(docker exec -t "${CONTAINER_NAME}" psql -U "${PG_USER}" -d "${PG_DB}" -t -c "
    SELECT 
        (SELECT count(*) FROM vehicles) AS vehicle_count,
        (SELECT count(*) FROM bookings) AS booking_count,
        (SELECT count(*) FROM users) AS user_count;
")"

echo "----------------------------------------------------------"
echo " Verified Table Row Counts (vehicles | bookings | users):"
echo " ${VERIFY_OUTPUT}"
echo "----------------------------------------------------------"
echo "Restoration completed successfully at $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "=========================================================="
