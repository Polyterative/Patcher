#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: bash scripts/restore-data.sh [--yes] <backup-file.sql>

Applies a previously created SQL backup to the database referenced by SUPABASE_DB_URL.

Safety:
  - This script writes to the target database
  - It prompts for explicit confirmation unless --yes is provided
  - SUPABASE_DB_URL must be set in .env or the shell environment
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required command not found: $1" >&2
    exit 1
  fi
}

mask_db_url() {
  echo "$1" | sed -E 's#(postgres(ql)?://[^:]+:)[^@]+@#\1[REDACTED]@#'
}

FORCE=false

while [ "$#" -gt 0 ]; do
  case "$1" in
    --yes)
      FORCE=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --*)
      echo "ERROR: unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

if [ "$#" -ne 1 ]; then
  usage >&2
  exit 1
fi

backup_file="$1"

if [ ! -f "${backup_file}" ]; then
  echo "ERROR: backup file not found: ${backup_file}" >&2
  exit 1
fi

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ".env"
  set +a
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "ERROR: SUPABASE_DB_URL must be set in .env or the current shell." >&2
  exit 1
fi

require_command psql

echo "WARNING: this operation writes to the target database."
echo "Backup file : ${backup_file}"
echo "Target DB   : $(mask_db_url "${SUPABASE_DB_URL}")"

if [ "$FORCE" = false ]; then
  echo
  printf 'Type RESTORE to continue: '
  read -r confirmation
  if [ "${confirmation}" != "RESTORE" ]; then
    echo "Restore aborted."
    exit 1
  fi
fi

echo "Final safety pause: press Ctrl-C within 10 seconds to abort."
sleep 10

psql --set ON_ERROR_STOP=1 "${SUPABASE_DB_URL}" -f "${backup_file}"

echo "Restore completed."
