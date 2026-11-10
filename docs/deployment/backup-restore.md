# Database Backup, Disaster Recovery & VPS Migration Guide

This guide details the automated backup procedures, integrity verification, storage retention policy, disaster recovery workflows, and server migration procedures for the AutoFleet Car Rental Platform.

---

## 1. Automated Backup Architecture

Database backups are produced using PostgreSQL's native `pg_dump` utility with gzip level-9 compression. Backups are stored **outside the application container** on the host filesystem (or external NFS/S3 storage volume) to ensure persistence across container lifecycles.

### Automated Script: `infrastructure/scripts/backup.sh`

The backup script performs the following actions:
1. **Container & Connection Check**: Ensures `carrental-postgres` is alive and responding to queries.
2. **Clean Schema & Data Dump**: Invokes `pg_dump --clean --if-exists --no-owner --no-privileges` to produce reproducible, self-contained SQL dumps.
3. **High-Ratio Compression**: Pipes directly to `gzip -9` to minimize storage consumption.
4. **Security Hardening**: Enforces `chmod 600` permissions on dump files to protect sensitive customer and financial records.
5. **Integrity Verification**: Executes `gzip -t` on the output file to guarantee archive readability.
6. **Retention Pruning**: Automatically prunes backups older than the configured retention period (`BACKUP_RETENTION_DAYS`, default: 14 days).

---

## 2. Scheduling Automated Backups (Cron)

To configure automated daily backups at 02:00 AM UTC:

1. Open crontab:
   ```bash
   crontab -e
   ```
2. Add the following entry:
   ```cron
   # AutoFleet Daily Database Backup at 02:00 UTC with 14-day retention
   0 2 * * * /opt/car-rental-platform/infrastructure/scripts/backup.sh /var/backups/carrental >> /var/log/carrental_backup.log 2>&1
   ```
3. Ensure the backup destination directory exists:
   ```bash
   sudo mkdir -p /var/backups/carrental
   sudo chown -R $USER:$USER /var/backups/carrental
   ```

---

## 3. Manual On-Demand Backup

To create an immediate backup before applying schema changes or system upgrades:

```bash
cd /opt/car-rental-platform
./infrastructure/scripts/backup.sh ./backups
```

Output:
```text
==========================================================
 Starting Database Backup: 2026-11-02 18:27:34 UTC
 Container   : carrental-postgres
 Database    : carrental_db
 Destination : ./backups/carrental_db_20261102_235734.sql.gz
==========================================================
[1/4] Checking PostgreSQL container status...
 PostgreSQL container is healthy.
[2/4] Dumping database and compressing...
 Backup written: ./backups/carrental_db_20261102_235734.sql.gz (562 KB)
[3/4] Verifying archive integrity...
 Archive integrity verified successfully (gzip test passed).
[4/4] Applying retention policy (14 days)...
 Retention check complete.
==========================================================
 BACKUP SUCCESSFUL
 Location: ./backups/carrental_db_20261102_235734.sql.gz
==========================================================
```

---

## 4. Disaster Recovery & Database Restoration

To restore from a backup file:

```bash
cd /opt/car-rental-platform
./infrastructure/scripts/restore.sh ./backups/carrental_db_20261102_235734.sql.gz
```

The script will prompt for explicit confirmation before proceeding, verify archive integrity, drop/recreate connections, restore schema and data, and run a verification query.

---

## 5. Cloud-Agnostic Server Migration

To migrate between any two VPS providers (e.g. from DigitalOcean to Hetzner) with zero data loss:

1. **Lower DNS TTL**: Set DNS TTL for your domain to 300 seconds 24 hours in advance.
2. **Export Database on Source Server**:
   ```bash
   ./infrastructure/scripts/backup.sh ./backups
   ```
3. **Sync Files to Target Server**:
   ```bash
   rsync -avz ./backups/ user@new-server:/opt/car-rental-platform/backups/
   ```
4. **Restore Database on Target Server**:
   ```bash
   ./infrastructure/scripts/restore.sh ./backups/carrental_db_*.sql.gz
   ```
5. **Switch DNS**: Update DNS A-record to point to the new server's IP address. Caddy will automatically issue fresh certificates on the new server.
