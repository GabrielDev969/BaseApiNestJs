#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <backup-file.dump>" >&2
  exit 1
fi
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "File not found: $BACKUP_FILE" >&2
  exit 1
fi

SAFE_URL=$(printf '%s' "$DATABASE_URL" | sed -E 's#://([^:]+):[^@]+@#://\1:***@#')
echo "WARNING: This will OVERWRITE the database at: $SAFE_URL"
echo "         Restoring from: $BACKUP_FILE"
read -r -p "Type 'yes' to continue: " confirm
[[ "$confirm" == "yes" ]] || { echo "Cancelled."; exit 0; }

echo "-> Restoring..."
pg_restore \
  --dbname="$DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "$BACKUP_FILE"

echo "-> Validating: prisma migrate status"
pnpm exec prisma migrate status

echo "-> Validating: row counts on core tables"
for tbl in User Workspace Role Permission WorkspaceMember; do
  count=$(psql "$DATABASE_URL" -At -c "SELECT COUNT(*) FROM \"$tbl\"" 2>/dev/null || echo "n/a")
  printf "   %-20s %s\n" "$tbl" "$count"
done

echo "OK Restore complete"
