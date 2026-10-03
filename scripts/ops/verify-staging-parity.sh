#!/usr/bin/env bash
#
# Read-only staging parity check (smoke level): compares the set of public
# tables, then per-table row counts (+ ordered id hashes where an `id` column
# exists) between the hosted source and the self-hosted restore target.
#
# Performs zero writes on either side. Connection strings are never printed.
# Any query error is a FAILURE (a failed query never counts as a match).
#
# Usage:
#   SOURCE_DB_URL="postgres://..." TARGET_DB_URL="postgres://..." \
#     bash scripts/ops/verify-staging-parity.sh
#
# Tables are discovered from the source (every ordinary/partitioned table in
# `public`), so new tables are covered automatically. Content-level checks
# live in verify-staging-parity-deep.sh.

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/pg-common.sh
source "${SCRIPT_DIR}/lib/pg-common.sh"

usage() {
  cat <<'EOF'
Usage: SOURCE_DB_URL="postgres://..." TARGET_DB_URL="postgres://..." bash scripts/ops/verify-staging-parity.sh

Read-only: table-set compare, then row counts (+ ordered id hashes) per public table.
Any query error fails the run. Zero writes; connection strings are never printed.
EOF
}

for arg in "$@"; do
  case "$arg" in
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: unknown argument: $arg" >&2; usage >&2; exit 1 ;;
  esac
done

command -v psql >/dev/null 2>&1 || { echo "ERROR: required command not found: psql" >&2; exit 1; }

if [ -z "${SOURCE_DB_URL:-}" ] || [ -z "${TARGET_DB_URL:-}" ]; then
  echo "ERROR: both SOURCE_DB_URL and TARGET_DB_URL must be set in the shell (never commit them)." >&2
  exit 1
fi
if [ "${SOURCE_DB_URL}" = "${TARGET_DB_URL}" ]; then
  echo "ERROR: source and target are identical; refusing to compare a database with itself." >&2
  exit 1
fi

TABLES_SQL="SELECT c.relname FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p') ORDER BY 1;"

failures=0

source_tables="$(pg_q "${SOURCE_DB_URL}" "${TABLES_SQL}")" || { echo "ERROR: cannot list source tables." >&2; exit 1; }
target_tables="$(pg_q "${TARGET_DB_URL}" "${TABLES_SQL}")" || { echo "ERROR: cannot list target tables." >&2; exit 1; }

echo "--- table set (public) ---"
if [ "${source_tables}" = "${target_tables}" ]; then
  echo "table set: OK ($(printf '%s\n' "${source_tables}" | grep -c .) tables)"
else
  echo "table set: DIFF (< source only, > target only)"
  diff <(printf '%s\n' "${source_tables}") <(printf '%s\n' "${target_tables}") | grep '^[<>]' || true
  failures=$((failures + 1))
fi

has_id_column() {
  local url="$1" table="$2"
  [ "$(pg_q "${url}" "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' AND column_name='id';")" = "1" ]
}

echo "--- per-table counts + id hashes ---"
printf '%-34s %12s %12s %8s %8s\n' "table" "source_n" "target_n" "count" "id_hash"
while IFS= read -r table; do
  [ -n "${table}" ] || continue
  count_sql="SELECT count(*) FROM public.\"${table}\";"
  if ! source_n="$(pg_q "${SOURCE_DB_URL}" "${count_sql}" 2>/dev/null)"; then source_n="ERROR"; fi
  if ! target_n="$(pg_q "${TARGET_DB_URL}" "${count_sql}" 2>/dev/null)"; then target_n="ERROR"; fi

  count_mark="OK"
  if [ "${source_n}" = "ERROR" ] || [ "${target_n}" = "ERROR" ]; then
    count_mark="ERROR"; failures=$((failures + 1))
  elif [ "${source_n}" != "${target_n}" ]; then
    count_mark="DIFF"; failures=$((failures + 1))
  fi

  hash_mark="n/a"
  if has_id_column "${SOURCE_DB_URL}" "${table}" 2>/dev/null; then
    hash_sql="SELECT md5(coalesce(string_agg(id::text, ',' ORDER BY id), '')) FROM public.\"${table}\";"
    if ! source_h="$(pg_q "${SOURCE_DB_URL}" "${hash_sql}" 2>/dev/null)"; then source_h="ERROR"; fi
    if ! target_h="$(pg_q "${TARGET_DB_URL}" "${hash_sql}" 2>/dev/null)"; then target_h="ERROR"; fi
    if [ "${source_h}" = "ERROR" ] || [ "${target_h}" = "ERROR" ]; then
      hash_mark="ERROR"; failures=$((failures + 1))
    elif [ "${source_h}" != "${target_h}" ]; then
      hash_mark="DIFF"; failures=$((failures + 1))
    else
      hash_mark="OK"
    fi
  fi
  printf '%-34s %12s %12s %8s %8s\n' "${table}" "${source_n}" "${target_n}" "${count_mark}" "${hash_mark}"
done <<< "${source_tables}"

if [ "${failures}" -eq 0 ]; then
  echo "Parity OK (smoke level): table set, counts and id hashes match. Run the deep gate next."
else
  echo "Parity FAILED: ${failures} problem(s) above (DIFF = data differs, ERROR = query failed)." >&2
  exit 1
fi
