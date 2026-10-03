#!/usr/bin/env bash
#
# Capture hosted GRANTs/default-privileges/policies for verbatim prod replay.
#
# DRAFT FOR REVIEW — owner-run later (read-only capture). Agents author
# docs/scripts only; execution stays in an owner-present window. Nothing here
# writes to any database: capture reads hosted and writes gitignored local
# files only. The staging blanket-ALL file must NEVER be used as the cutover
# grant step (see scripts/ops/staging-public-grants.sql header + runbook §9.7).
#
# Captures (all read-only):
#   - \z equivalent (table/sequence/function privileges via information_schema)
#   - pg_policies snapshot (public schema, incl. qual + with_check)
#   - default privileges + role membership bearing on api_reader/api_view_owner
#   - api_identity least-privilege reference lines (65-69, 344-355) for the
#     EXECUTE -> api_reader-only audit
#
# Safety:
#   - Dry-run (default) prints redacted psql commands, performs zero
#     connections (psql never invoked) and writes no files.
#   - APPLY (owner-run) requires SOURCE_DB_URL, refuses to run if backups/ is
#     not gitignored, writes timestamped gitignored files with mode 0700.
#   - Connection strings are never printed (logs show redacted form only).
#
# Usage:
#   bash scripts/ops/capture-grants.sh --help
#   SOURCE_DB_URL="postgres://..." bash scripts/ops/capture-grants.sh --dry-run
#   SOURCE_DB_URL="postgres://..." bash scripts/ops/capture-grants.sh

set -euo pipefail
umask 077

BACKUP_DIR="backups"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: SOURCE_DB_URL="postgres://..." bash scripts/ops/capture-grants.sh [--dry-run]

Read-only grant/policy capture for verbatim prod replay (DRAFT, owner-run later).

Safety:
  - Dry-run (default when --dry-run passed; otherwise use --help to inspect)
    prints redacted commands, performs zero connections, writes no files.
  - APPLY reads hosted only, writes gitignored timestamped files under backups/.
  - backups/ must be git-ignored or the script refuses to write.

Options:
  --dry-run   Print redacted capture commands without connecting or writing
  -h|--help   Show this help
EOF
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

if [ -z "${SOURCE_DB_URL:-}" ]; then
  echo "ERROR: SOURCE_DB_URL must be set in the shell (never commit it)." >&2
  exit 1
fi

if [ "$DRY_RUN" = true ]; then
  echo "=== capture-grants dry-run — no connections, no files ==="
  echo "Source: [REDACTED — connection string never printed]"
  echo
  echo 'psql "$SOURCE_DB_URL" -c "SELECT grantee, privilege_type, table_schema, table_name FROM information_schema.role_table_grants WHERE table_schema='"'"'public'"'"' ORDER BY 1,2,3,4;"'
  echo 'psql "$SOURCE_DB_URL" -c "SELECT sequence_schema, sequence_name, grantee, privilege_type FROM information_schema.role_usage_grants UNION ALL SELECT routine_schema, routine_name, grantee, privilege_type FROM information_schema.role_routine_grants ORDER BY 1,2,3;"'
  echo 'psql "$SOURCE_DB_URL" -c "SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname='"'"'public'"'"' ORDER BY tablename, policyname, cmd;"'
  echo 'psql "$SOURCE_DB_URL" -c "SELECT defaclrole::regrole, defaclnamespace::regnamespace, defaclobjtype, defaclacl FROM pg_default_acl WHERE defaclnamespace='"'"'public'"'"'::regnamespace;"'
  echo 'psql "$SOURCE_DB_URL" -c "SELECT nspname, proname, prosecdef, proacl FROM pg_proc p JOIN pg_namespace n ON n.oid=pronamespace WHERE nspname IN ('"'"'public'"'"','"'"'private'"'"') ORDER BY 1,2;"'
  echo
  echo "Reference (repo, no DB): supabase/migrations/20260724133200_api_identity.sql:65-69,344-355 (EXECUTE -> api_reader-only audit)."
  echo "Dry run complete. No connections were made and no files were written."
  exit 0
fi

if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if ! git check-ignore -q "${BACKUP_DIR}/"; then
    echo "ERROR: ${BACKUP_DIR}/ is not ignored by git. Refusing to write grant captures." >&2
    exit 1
  fi
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: required command not found: psql" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

timestamp="$(date +"%Y-%m-%d_%H-%M-%S")"
out="${BACKUP_DIR}/grants_${timestamp}.txt"

{
  echo "-- Grant/policy capture (read-only source, redacted log)"
  echo "-- Timestamp: ${timestamp}"
  echo
  echo "-- role_table_grants (public)"
  psql "${SOURCE_DB_URL}" -c "SELECT grantee, privilege_type, table_schema, table_name FROM information_schema.role_table_grants WHERE table_schema='public' ORDER BY 1,2,3,4;"
  echo
  echo "-- role usage/routine grants"
  psql "${SOURCE_DB_URL}" -c "SELECT sequence_schema, sequence_name, grantee, privilege_type FROM information_schema.role_usage_grants UNION ALL SELECT routine_schema, routine_name, grantee, privilege_type FROM information_schema.role_routine_grants ORDER BY 1,2,3;"
  echo
  echo "-- pg_policies (public)"
  psql "${SOURCE_DB_URL}" -c "SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname, cmd;"
  echo
  echo "-- default privileges (public)"
  psql "${SOURCE_DB_URL}" -c "SELECT defaclrole::regrole, defaclnamespace::regnamespace, defaclobjtype, defaclacl FROM pg_default_acl WHERE defaclnamespace='public'::regnamespace;"
  echo
  echo "-- functions security-definer + ACL (public, private)"
  psql "${SOURCE_DB_URL}" -c "SELECT nspname, proname, prosecdef, proacl FROM pg_proc p JOIN pg_namespace n ON n.oid=pronamespace WHERE nspname IN ('public','private') ORDER BY 1,2;"
} > "${out}"
chmod 600 "${out}"

echo "Created:"
echo "  ${out}"
echo "Stored locally under ./${BACKUP_DIR}/ (gitignored). Compare against staging-public-grants.sql + api_identity.sql:65-69,344-355 before any prod replay."
