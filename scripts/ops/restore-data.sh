#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: bash scripts/ops/restore-data.sh [--yes] [--allow-hosted] <backup-file.sql>

Applies a previously created SQL backup to the target database.

Target selection (first set wins):
  1. TARGET_DB_URL in the shell environment (preferred for staging restores)
  2. SUPABASE_DB_URL in .env or the shell environment

Safety:
  - This script writes to the target database
  - It prompts for explicit confirmation unless --yes is provided
  - Targets that look hosted are REFUSED unless --allow-hosted is passed,
    so a staging backup cannot accidentally overwrite the hosted project.
    Staging restores must point at the self-hosted empty instance.

Options:
  --yes             Skip the interactive confirmation (10s pause still applies)
  --allow-hosted    Permit a target that looks like the hosted project
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
ALLOW_HOSTED=false

while [ "$#" -gt 0 ]; do
  case "$1" in
    --yes)
      FORCE=true
      shift
      ;;
    --allow-hosted)
      ALLOW_HOSTED=true
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

TARGET_DB_URL="${TARGET_DB_URL:-${SUPABASE_DB_URL:-}}"

if [ -z "${TARGET_DB_URL:-}" ]; then
  echo "ERROR: TARGET_DB_URL (preferred for staging) or SUPABASE_DB_URL must be set." >&2
  echo "For a staging rehearsal, export TARGET_DB_URL pointing at the self-hosted" >&2
  echo "empty instance in the shell; never point it at the hosted project." >&2
  exit 1
fi

case "${TARGET_DB_URL}" in
  *supabase.co*|*pooler.supabase.com*)
    if [ "${ALLOW_HOSTED}" != true ]; then
      echo "ERROR: target looks like the hosted project; refusing without --allow-hosted." >&2
      echo "Staging restores must target the self-hosted instance via TARGET_DB_URL." >&2
      exit 1
    fi
    ;;
esac

require_command psql

echo "WARNING: this operation writes to the target database."
echo "Backup file : ${backup_file}"
echo "Target DB   : $(mask_db_url "${TARGET_DB_URL}")"

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

psql --set ON_ERROR_STOP=1 "${TARGET_DB_URL}" -f "${backup_file}"

echo "Restore completed."
