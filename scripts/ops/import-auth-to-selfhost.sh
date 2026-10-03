#!/usr/bin/env bash
#
# UUID-preserving auth import: hosted Supabase -> self-hosted Supabase.
#
# Copies auth.users + auth.identities (passwords ride along as bcrypt hashes,
# Google/SSO links as identities) so every existing profiles/racks/patches row
# keeps its owner. Optional --include-sessions also copies auth.sessions,
# auth.refresh_tokens and MFA tables, which (only together with a preserved JWT
# secret) keeps users logged in across the move.
#
# Default is a READ-ONLY dry run (preflight only). --apply writes to the target.
#
# Safety:
#   - target must carry the `patcher_selfhost_marker` role (lib/pg-common.sh);
#     source must not. No flag bypasses this.
#   - target must have ZERO auth.users rows (delete staging throwaways first;
#     this script never truncates — a TRUNCATE ... CASCADE would wipe profiles).
#   - target GoTrue schema must be >= source (auth.schema_migrations), and every
#     source column must exist on the target.
#   - bulk load runs with session_replication_role = replica (user triggers and
#     FK checks off — needs a SUPERUSER target login, e.g. supabase_admin), in a
#     single transaction, so a failure leaves the target untouched.
#   - after the load, handle_new_user + on_auth_user_created are recreated
#     verbatim from the repo migration (the public-schema dump never carries the
#     auth.users trigger). Firing it during the load would re-stamp every
#     profile's updated_at, hence replica mode.
#   - the dump holds real emails + password hashes: written to gitignored
#     backups/ with 0600 perms. Delete it after the import.
#
# Usage:
#   SOURCE_DB_URL=... TARGET_DB_URL=... bash scripts/ops/import-auth-to-selfhost.sh            # dry run
#   SOURCE_DB_URL=... TARGET_DB_URL=... bash scripts/ops/import-auth-to-selfhost.sh --apply
#   TARGET_DB_URL=... bash scripts/ops/import-auth-to-selfhost.sh --apply --dump-file backups/auth-....sql
#     (load a dump taken elsewhere, e.g. with a newer pg_dump inside the NAS db container;
#      with --dump-file and no SOURCE_DB_URL, source-side checks and the post-load
#      count compare are skipped — run the dry run against the source first)

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=lib/pg-common.sh
source "${SCRIPT_DIR}/lib/pg-common.sh"

TRIGGER_MIGRATION="${REPO_ROOT}/supabase/migrations/20260423132000_fix_auth_signup_profile_username.sql"
BACKUP_DIR="${REPO_ROOT}/backups"
PG_DUMP="${PG_DUMP:-pg_dump}"

APPLY=0
INCLUDE_SESSIONS=0
DUMP_FILE=""

usage() {
  sed -n '2,37p' "$0" | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --apply) APPLY=1; shift ;;
    --dry-run) APPLY=0; shift ;;
    --include-sessions) INCLUDE_SESSIONS=1; shift ;;
    --dump-file) DUMP_FILE="${2:-}"; shift 2 ;;
    *) echo "ERROR: unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

TABLES=(auth.users auth.identities)
if [ "${INCLUDE_SESSIONS}" -eq 1 ]; then
  TABLES+=(auth.sessions auth.refresh_tokens auth.mfa_factors auth.mfa_amr_claims)
fi

command -v psql >/dev/null 2>&1 || { echo "ERROR: psql not found" >&2; exit 1; }
[ -n "${TARGET_DB_URL:-}" ] || { echo "ERROR: TARGET_DB_URL must be set (self-host, superuser login)." >&2; exit 1; }
if [ -z "${DUMP_FILE}" ] && [ -z "${SOURCE_DB_URL:-}" ]; then
  echo "ERROR: SOURCE_DB_URL must be set (or pass --dump-file)." >&2; exit 1
fi
[ -f "${TRIGGER_MIGRATION}" ] || { echo "ERROR: trigger migration missing: ${TRIGGER_MIGRATION}" >&2; exit 1; }

echo "== Preflight (read-only) =="
echo "target: $(mask_db_url "${TARGET_DB_URL}")"
require_selfhost_target "${TARGET_DB_URL}"
echo "target marker: OK"

if [ "$(pg_q "${TARGET_DB_URL}" "SELECT rolsuper FROM pg_roles WHERE rolname = current_user;")" != "t" ]; then
  echo "ERROR: target login is not a superuser (replica-mode load needs one, e.g. supabase_admin)." >&2
  exit 1
fi

target_users="$(pg_q "${TARGET_DB_URL}" "SELECT count(*) FROM auth.users;")"
if [ "${target_users}" != "0" ]; then
  echo "ERROR: target already has ${target_users} auth.users row(s). Delete staging throwaways first:" >&2
  pg_q "${TARGET_DB_URL}" "SELECT '  ' || id || '  @' || split_part(coalesce(email, ''), '@', 2) || '  created ' || created_at::date FROM auth.users ORDER BY created_at LIMIT 20;" >&2
  exit 1
fi
echo "target auth.users empty: OK"

target_auth_ver="$(pg_q "${TARGET_DB_URL}" "SELECT max(version) FROM auth.schema_migrations;")"

SOURCE_COUNTS=""
if [ -n "${SOURCE_DB_URL:-}" ]; then
  echo "source: $(mask_db_url "${SOURCE_DB_URL}")"
  require_not_selfhost_source "${SOURCE_DB_URL}"

  source_auth_ver="$(pg_q "${SOURCE_DB_URL}" "SELECT max(version) FROM auth.schema_migrations;")"
  echo "GoTrue schema: source ${source_auth_ver} / target ${target_auth_ver}"
  if [[ "${target_auth_ver}" < "${source_auth_ver}" ]]; then
    echo "ERROR: target GoTrue schema is OLDER than source — upgrade the self-host auth image first." >&2
    exit 1
  fi

  for t in "${TABLES[@]}"; do
    cols_sql="SELECT string_agg(attname, ',' ORDER BY attname) FROM pg_attribute WHERE attrelid = '${t}'::regclass AND attnum > 0 AND NOT attisdropped AND attgenerated = '';"
    s_cols="$(pg_q "${SOURCE_DB_URL}" "${cols_sql}")"
    t_cols="$(pg_q "${TARGET_DB_URL}" "${cols_sql}")"
    missing="$(comm -23 <(tr ',' '\n' <<< "${s_cols}" | sort) <(tr ',' '\n' <<< "${t_cols}" | sort) | paste -sd, -)"
    if [ -n "${missing}" ]; then
      echo "ERROR: ${t} columns on source but not on target: ${missing}" >&2
      exit 1
    fi
    n="$(pg_q "${SOURCE_DB_URL}" "SELECT count(*) FROM ${t};")"
    SOURCE_COUNTS="${SOURCE_COUNTS}${t}=${n}"$'\n'
    echo "${t}: source rows ${n}, columns compatible"
  done

  s_major="$(server_major "${SOURCE_DB_URL}")"
  c_major="$(client_major "${PG_DUMP}")"
  if [ "${c_major}" -lt "${s_major}" ]; then
    echo "ERROR: ${PG_DUMP} is v${c_major} but source is PG${s_major}; set PG_DUMP to a v${s_major}+ binary." >&2
    exit 1
  fi
fi

if [ "${APPLY}" -ne 1 ]; then
  echo "Dry run complete — nothing dumped, nothing written. Re-run with --apply."
  exit 0
fi

if [ -z "${DUMP_FILE}" ]; then
  mkdir -p "${BACKUP_DIR}"
  DUMP_FILE="${BACKUP_DIR}/auth-$(date -u +%Y%m%dT%H%M%SZ).sql"
  table_args=()
  for t in "${TABLES[@]}"; do table_args+=(--table="${t}"); done
  echo "== Dumping ${TABLES[*]} (read-only on source) -> ${DUMP_FILE}"
  "${PG_DUMP}" "${SOURCE_DB_URL}" --data-only --no-owner --no-acl "${table_args[@]}" --file="${DUMP_FILE}"
  chmod 600 "${DUMP_FILE}"
fi
[ -s "${DUMP_FILE}" ] || { echo "ERROR: dump file missing or empty: ${DUMP_FILE}" >&2; exit 1; }

echo
echo "About to import ${TABLES[*]} into $(mask_db_url "${TARGET_DB_URL}") in ONE transaction."
printf 'Type IMPORT AUTH to continue: '
read -r answer
[ "${answer}" = "IMPORT AUTH" ] || { echo "Aborted."; exit 1; }
echo "Starting in 10 s (Ctrl-C to abort)..."; sleep 10

psql "${TARGET_DB_URL}" -X -v ON_ERROR_STOP=1 --single-transaction -q >/dev/null <<SQL
SET session_replication_role = replica;
\i ${DUMP_FILE}
SET session_replication_role = origin;
\i ${TRIGGER_MIGRATION}
SQL

echo "== Verify =="
fail=0
for t in "${TABLES[@]}"; do
  n="$(pg_q "${TARGET_DB_URL}" "SELECT count(*) FROM ${t};")"
  expected="$(printf '%s' "${SOURCE_COUNTS}" | grep "^${t}=" | cut -d= -f2 || true)"
  if [ -n "${expected}" ] && [ "${n}" != "${expected}" ]; then
    echo "${t}: target ${n} != source ${expected}  DIFF"; fail=1
  else
    echo "${t}: target ${n}${expected:+ (source ${expected})}  OK"
  fi
done
trig="$(pg_q "${TARGET_DB_URL}" "SELECT count(*) FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created' AND tgenabled = 'O';")"
echo "on_auth_user_created present + enabled: $([ "${trig}" = "1" ] && echo OK || { fail=1; echo MISSING; })"
orphans="$(pg_q "${TARGET_DB_URL}" "SELECT count(*) FROM public.profiles p WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);")"
no_profile="$(pg_q "${TARGET_DB_URL}" "SELECT count(*) FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);")"
echo "profiles without a user: ${orphans}   users without a profile: ${no_profile}"
echo "  (non-zero = public data and auth were copied at different times; refresh public data, then re-check)"

echo
echo "Next proofs (manual): password throwaway login, Google throwaway repeat-login lands on the same UUID,"
echo "fresh signup creates a profiles row, owner rack write succeeds."
echo "REMINDER: ${DUMP_FILE} holds real emails + password hashes — delete it when done."
exit "${fail}"
