#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date -u +%Y%m%d_%H%M%SZ)
BACKUP_FILE="$BACKUP_DIR/workspace-api_${TIMESTAMP}.dump"

echo "-> Backing up to $BACKUP_FILE"
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "OK Backup complete: $BACKUP_FILE ($SIZE)"

DELETED=$(find "$BACKUP_DIR" -name 'workspace-api_*.dump' -mtime "+$RETENTION_DAYS" -print -delete | wc -l | tr -d ' ')
echo "OK Cleanup: removed $DELETED dump(s) older than $RETENTION_DAYS days"
