#!/usr/bin/env bash

set -euo pipefail
umask 077

BACKUP_DIR="backups"
KEEP_LAST="${KEEP_LAST:-30}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: bash scripts/backup-data.sh [--dry-run]

Creates timestamped schema and data backups from the linked Supabase project.

Safety:
  - Remote operation is read-only (`pg_dump`)
  - Output stays local in ./backups/
  - Script refuses to run if ./backups/ is not ignored by git
  - Uses Supabase CLI only to fetch temporary dump credentials from the linked project

Options:
  --dry-run   Print the exact redacted dump commands without writing files
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

extract_dump_script() {
  local raw_output

  if [ "$#" -eq 0 ]; then
    raw_output="$(supabase db dump --linked --dry-run 2>&1)"
  else
    raw_output="$(supabase db dump --linked "$@" --dry-run 2>&1)"
  fi

  printf '%s\n' "${raw_output}" \
    | sed -n '/^#!\/usr\/bin\/env bash$/,$p' \
    | sed '/^A new version of Supabase CLI is available:/,$d'
}

print_redacted_dry_run() {
  extract_dump_script "$@" | sed -E 's#(export PGPASSWORD=\").*(\")#\1[REDACTED]\2#'
}

run_dump_to_file() {
  local output_file="$1"
  shift

  local dump_script
  dump_script="$(extract_dump_script "$@")"

  if [ -z "${dump_script}" ]; then
    echo "ERROR: could not extract a pg_dump script from Supabase CLI." >&2
    exit 1
  fi

  if ! printf '%s\n' "${dump_script}" | grep -q 'pg_dump'; then
    echo "ERROR: extracted dump script did not contain pg_dump." >&2
    exit 1
  fi

  printf '%s\n' "${dump_script}" | bash > "${output_file}"
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

require_command supabase
require_command pg_dump

if [ "$DRY_RUN" = true ]; then
  echo "=== backup dry-run: schema dump ==="
  print_redacted_dry_run
  echo
  echo "=== backup dry-run: data dump ==="
  print_redacted_dry_run --data-only --use-copy
  echo
  echo "Dry run complete. No local files were written and no remote writes were performed."
  exit 0
fi

ensure_backups_ignored

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

timestamp="$(date +"%Y-%m-%d_%H-%M-%S")"
schema_file="${BACKUP_DIR}/schema_${timestamp}.sql"
data_file="${BACKUP_DIR}/data_${timestamp}.sql"

echo "Creating read-only schema backup..."
run_dump_to_file "${schema_file}"

echo "Creating read-only data backup..."
run_dump_to_file "${data_file}" --data-only --use-copy

rotate_backups "schema"
rotate_backups "data"

echo "Created:"
echo "  ${schema_file}"
echo "  ${data_file}"
echo "Stored locally under ./${BACKUP_DIR}/ (gitignored)."
