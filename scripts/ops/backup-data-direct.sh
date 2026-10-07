#!/usr/bin/env bash
#
# Direct read-only database backup without the Supabase CLI.
#
# Creates timestamped public-schema backups (schema + data) with pg_dump only.
# Use this when `supabase db dump --linked` is unavailable; it performs the same
# read-only operation using an owner-supplied connection string.
#
# Safety:
#   - Remote operation is read-only (`pg_dump` against the source only)
#   - Output stays local in ./backups/ (gitignored, mode 0700)
#   - Script refuses to run if ./backups/ is not ignored by git
#   - The connection string is never printed (logs show a redacted form)
#   - Nothing is restored, migrated, or written to any database here
#
# Usage:
#   SOURCE_DB_URL="postgres://..." bash scripts/ops/backup-data-direct.sh [--dry-run]
#   pnpm backup:data:direct   (with SOURCE_DB_URL exported in the shell)
#
# Options:
#   --dry-run   Print the exact redacted pg_dump commands without writing files
#
# Scope: public schema only (tables, RLS, triggers, RPCs). Extensions, cron
# schedules, Vault secrets, auth users, and storage objects are separate
# follow-ups documented in the staging runbook.

set -euo pipefail
umask 077

BACKUP_DIR="backups"
KEEP_LAST="${KEEP_LAST:-30}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: SOURCE_DB_URL="postgres://..." bash scripts/ops/backup-data-direct.sh [--dry-run]

Creates timestamped public-schema backups (schema + data) via direct pg_dump.

Safety:
  - Remote operation is read-only (pg_dump against the source only)
  - Output stays local in ./backups/
  - Script refuses to run if ./backups/ is not ignored by git
  - The connection string is never printed

Options:
  --dry-run   Print the exact redacted pg_dump commands without writing files
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required command not found: $1" >&2
    if [ "$1" = "pg_dump" ]; then
      echo "Install PostgreSQL client tools first, for example: brew install postgresql@16" >&2
    fi
    exit 1
  fi
}

ensure_backups_ignored() {
  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if ! git check-ignore -q "${BACKUP_DIR}/"; then
      echo "ERROR: ${BACKUP_DIR}/ is not ignored by git. Refusing to write database backups." >&2
      echo "Add /${BACKUP_DIR}/ to .gitignore before running this command." >&2
      exit 1
    fi
  fi
}

rotate_backups() {
  local prefix="$1"
  local files=()
  local index=0

  shopt -s nullglob
  files=("${BACKUP_DIR}/${prefix}"_*.sql)
  shopt -u nullglob

  if [ "${#files[@]}" -eq 0 ]; then
    return 0
  fi

  for file in $(ls -1t "${files[@]}"); do
    index=$((index + 1))
    if [ "$index" -le "$KEEP_LAST" ]; then
      continue
    fi
    rm -- "$file"
  done
}

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown argument: $arg" >&2
      usage >&2
      exit 1
      ;;
  esac
done

require_command pg_dump

if [ -z "${SOURCE_DB_URL:-}" ] && [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ".env"
  set +a
fi

if [ -z "${SOURCE_DB_URL:-}" ]; then
  echo "ERROR: SOURCE_DB_URL must be set in the shell environment or .env (never commit it)." >&2
  echo "Paste the read-only connection string from the hosting dashboard into the shell," >&2
  echo "e.g. SOURCE_DB_URL=\"postgres://...\" bash scripts/ops/backup-data-direct.sh --dry-run" >&2
  exit 1
fi

# shellcheck disable=SC2086
SCHEMA_CMD="pg_dump \"${SOURCE_DB_URL}\" --schema-only --schema=public --no-owner --no-acl"
# shellcheck disable=SC2086
DATA_CMD="pg_dump \"${SOURCE_DB_URL}\" --data-only --schema=public --no-owner --no-acl"

if [ "$DRY_RUN" = true ]; then
  echo "=== backup-direct dry-run: schema dump ==="
  echo "$SCHEMA_CMD" | sed -E 's#postgres(ql)?://[^ "]+#postgres://[REDACTED]#g'
  echo
  echo "=== backup-direct dry-run: data dump ==="
  echo "$DATA_CMD" | sed -E 's#postgres(ql)?://[^ "]+#postgres://[REDACTED]#g'
  echo
  echo "Source: [REDACTED — connection string never printed]"
  echo "Dry run complete. No local files were written and no remote writes were performed."
  exit 0
fi

ensure_backups_ignored

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

timestamp="$(date +"%Y-%m-%d_%H-%M-%S")"
schema_file="${BACKUP_DIR}/schema_${timestamp}.sql"
data_file="${BACKUP_DIR}/data_${timestamp}.sql"

echo "Creating read-only public-schema backup from redacted source..."
pg_dump "${SOURCE_DB_URL}" --schema-only --schema=public --no-owner --no-acl -f "${schema_file}"

echo "Creating read-only public-data backup from redacted source..."
pg_dump "${SOURCE_DB_URL}" --data-only --schema=public --no-owner --no-acl -f "${data_file}"

rotate_backups "schema"
rotate_backups "data"

echo "Created:"
echo "  ${schema_file}"
echo "  ${data_file}"
echo "Stored locally under ./${BACKUP_DIR}/ (gitignored)."
