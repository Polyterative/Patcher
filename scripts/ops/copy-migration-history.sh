#!/usr/bin/env bash
#
# Copy the Supabase CLI migration history (schema `supabase_migrations`) from
# hosted to the self-host, so `supabase migration list/push --db-url <self-host>`
# sees every already-applied repo migration as applied instead of re-running all.
#
# Default is a READ-ONLY dry run: compares history on both sides and against
# the repo's supabase/migrations/*.sql files. --apply copies the schema.
#
# Safety: target must carry the `patcher_selfhost_marker` role; source must not.
# Refuses when the target already has history rows (nothing is overwritten).
# Load runs in a single transaction. No user data is involved (the history
# table holds migration names + statements only); the dump still goes to the
# gitignored backups/ directory.
#
# Usage:
#   SOURCE_DB_URL=... TARGET_DB_URL=... bash scripts/ops/copy-migration-history.sh [--apply]

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=lib/pg-common.sh
source "${SCRIPT_DIR}/lib/pg-common.sh"

PG_DUMP="${PG_DUMP:-pg_dump}"
APPLY=0

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --apply) APPLY=1; shift ;;
    --dry-run) APPLY=0; shift ;;
    *) echo "ERROR: unknown argument: $1" >&2; exit 1 ;;
  esac
done

[ -n "${SOURCE_DB_URL:-}" ] && [ -n "${TARGET_DB_URL:-}" ] || {
  echo "ERROR: SOURCE_DB_URL and TARGET_DB_URL must both be set." >&2; exit 1; }

require_staging_target "${TARGET_DB_URL}"
require_not_selfhost_source "${SOURCE_DB_URL}"

HISTORY_SQL="SELECT version FROM supabase_migrations.schema_migrations ORDER BY 1;"
EXISTS_SQL="SELECT count(*) FROM pg_namespace WHERE nspname = 'supabase_migrations';"

source_versions="$(pg_q "${SOURCE_DB_URL}" "${HISTORY_SQL}")"
repo_versions="$(find "${REPO_ROOT}/supabase/migrations" -maxdepth 1 -name '*.sql' -exec basename {} \; | cut -d_ -f1 | sort)"

echo "source history: $(grep -c . <<< "${source_versions}") versions; repo files: $(grep -c . <<< "${repo_versions}")"
repo_only="$(comm -13 <(sort <<< "${source_versions}") <(echo "${repo_versions}"))"
hosted_only="$(comm -23 <(sort <<< "${source_versions}") <(echo "${repo_versions}"))"
[ -z "${repo_only}" ] || echo "repo migrations NOT applied on hosted (pending or drift): $(paste -sd' ' - <<< "${repo_only}")"
[ -z "${hosted_only}" ] || echo "hosted history entries with no repo file (pre-history or dashboard-applied): $(grep -c . <<< "${hosted_only}")"

target_has_schema="$(pg_q "${TARGET_DB_URL}" "${EXISTS_SQL}")"
if [ "${target_has_schema}" = "1" ]; then
  target_versions="$(pg_q "${TARGET_DB_URL}" "${HISTORY_SQL}")"
  if [ "${target_versions}" = "${source_versions}" ]; then
    echo "target history already matches source: OK"; exit 0
  fi
  if [ -n "${target_versions}" ]; then
    echo "ERROR: target already has $(grep -c . <<< "${target_versions}") history rows that differ from source; resolve by hand." >&2
    exit 1
  fi
fi

if [ "${APPLY}" -ne 1 ]; then
  echo "Dry run complete — target has no history yet. Re-run with --apply to copy it."
  exit 0
fi

s_major="$(server_major "${SOURCE_DB_URL}")"; c_major="$(client_major "${PG_DUMP}")"
[ "${c_major}" -ge "${s_major}" ] || { echo "ERROR: ${PG_DUMP} v${c_major} < source PG${s_major}; set PG_DUMP." >&2; exit 1; }

mkdir -p "${REPO_ROOT}/backups"
dump="${REPO_ROOT}/backups/migration-history-$(date -u +%Y%m%dT%H%M%SZ).sql"
dump_args=(--schema=supabase_migrations --no-owner --no-acl)
# Empty schema already present on target -> data only.
[ "${target_has_schema}" = "1" ] && dump_args+=(--data-only)
"${PG_DUMP}" "${SOURCE_DB_URL}" "${dump_args[@]}" --file="${dump}"
chmod 600 "${dump}"

psql "${TARGET_DB_URL}" -X -v ON_ERROR_STOP=1 --single-transaction -q -f "${dump}" >/dev/null

target_versions="$(pg_q "${TARGET_DB_URL}" "${HISTORY_SQL}")"
if [ "${target_versions}" = "${source_versions}" ]; then
  echo "Migration history copied: $(grep -c . <<< "${target_versions}") versions match source. OK"
  echo "Next: supabase migration list --db-url <self-host> should show every repo migration as applied."
else
  echo "ERROR: target history differs from source after load." >&2
  exit 1
fi
