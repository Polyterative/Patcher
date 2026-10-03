#!/usr/bin/env bash
#
# Deep staging parity gate (Phase 1 exit). Read-only on both sides; connection
# strings are never printed. Any query error is a FAILURE.
#
# HARD sections (fail the run):
#   content     per-table row count + order-independent sum of per-row md5
#               (constant memory — no giant string_agg)
#   rls         relrowsecurity / relforcerowsecurity per public table
#   policies    public + storage schemas (table, name, permissive, cmd, roles,
#               qual, with_check)
#   triggers    public tables + auth.users triggers that call public functions
#               (catches a missing on_auth_user_created), incl. enabled state
#   functions   public + private: signature, security definer, owner,
#               proconfig (search_path), body md5
#   views       public views: owner + definition md5 (catches --no-owner drift)
#   privileges  table/view/function/schema ACLs, normalised via aclexplode
#               (fails until hosted grants are replayed verbatim — by design)
#   extensions  installed extension names
# SOFT sections (printed for a human verdict): sequence last_values,
# extension versions, snapshot-RPC output hashes.
#
# Row text is normalised via lib/pg-common.sh session settings (UTC, ISO dates,
# extra_float_digits=1) so PG15 and PG17 hash the same values identically.
#
# Usage:
#   SOURCE_DB_URL="postgres://..." TARGET_DB_URL="postgres://..." \
#     bash scripts/ops/verify-staging-parity-deep.sh [--only content|rls|...]

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/pg-common.sh
source "${SCRIPT_DIR}/lib/pg-common.sh"

ONLY=""
usage() {
  cat <<'EOF'
Usage: SOURCE_DB_URL="postgres://..." TARGET_DB_URL="postgres://..." bash scripts/ops/verify-staging-parity-deep.sh [--only SECTION]

Deep read-only parity. HARD: content, rls, policies, triggers, functions, views,
privileges, extensions. SOFT: sequences, extension versions, snapshot RPCs.
Any query error fails the run. Zero writes on either side.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --only) ONLY="${2:-}"; shift 2 ;;
    *) echo "ERROR: unknown argument: $1" >&2; usage >&2; exit 1 ;;
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

hard_fail=0
want() { [ -z "${ONLY}" ] || [ "${ONLY}" = "$1" ]; }

# Run SQL on both sides and diff the sorted row output. Prints up to 25 lines.
compare_section() {
  local name="$1" sql="$2" s t
  if ! s="$(pg_rows "${SOURCE_DB_URL}" "${sql}" 2>&1)"; then
    echo "${name}: ERROR on source: ${s%%$'\n'*}"; hard_fail=$((hard_fail + 1)); return
  fi
  if ! t="$(pg_rows "${TARGET_DB_URL}" "${sql}" 2>&1)"; then
    echo "${name}: ERROR on target: ${t%%$'\n'*}"; hard_fail=$((hard_fail + 1)); return
  fi
  if [ "${s}" = "${t}" ]; then
    echo "${name}: OK ($(printf '%s\n' "${s}" | grep -c .) rows)"
  else
    echo "${name}: DIFF (< source only, > target only)"
    diff <(printf '%s\n' "${s}" | sort) <(printf '%s\n' "${t}" | sort) | grep '^[<>]' | head -25 || true
    hard_fail=$((hard_fail + 1))
  fi
}

ACL_FMT="coalesce((SELECT string_agg(x, ',' ORDER BY x) FROM (SELECT CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END || ':' || a.privilege_type || CASE WHEN a.is_grantable THEN '*' ELSE '' END AS x FROM aclexplode(%s) a) acl), '<default>')"

if want content; then
  echo "--- HARD: content (count + order-independent row-hash sum) ---"
  TABLES_SQL="SELECT relname FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r','p') ORDER BY 1;"
  tables="$(pg_q "${SOURCE_DB_URL}" "${TABLES_SQL}")" || { echo "ERROR: cannot list source tables." >&2; exit 1; }
  printf '%-34s %8s\n' "table" "content"
  while IFS= read -r table; do
    [ -n "${table}" ] || continue
    sql="SELECT count(*)::text || ':' || coalesce(sum(('x' || substr(md5(t::text), 1, 16))::bit(64)::bigint::numeric), 0)::text FROM public.\"${table}\" t;"
    if ! s="$(pg_q "${SOURCE_DB_URL}" "${sql}" 2>/dev/null)"; then s="ERROR"; fi
    if ! t="$(pg_q "${TARGET_DB_URL}" "${sql}" 2>/dev/null)"; then t="ERROR"; fi
    mark="OK"
    if [ "${s}" = "ERROR" ] || [ "${t}" = "ERROR" ]; then mark="ERROR"; hard_fail=$((hard_fail + 1))
    elif [ "${s}" != "${t}" ]; then mark="DIFF"; hard_fail=$((hard_fail + 1)); fi
    printf '%-34s %8s\n' "${table}" "${mark}"
  done <<< "${tables}"
fi

if want rls; then
  echo "--- HARD: RLS enabled/forced per public table ---"
  compare_section "rls" "SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r','p') ORDER BY 1;"
fi

if want policies; then
  echo "--- HARD: policies (public + storage) ---"
  compare_section "policies" "SELECT schemaname, tablename, policyname, permissive, cmd, (SELECT string_agg(r, ',' ORDER BY r) FROM unnest(roles) r), md5(coalesce(qual, '')), md5(coalesce(with_check, '')) FROM pg_policies WHERE schemaname IN ('public', 'storage') ORDER BY 1, 2, 3;"
fi

if want triggers; then
  echo "--- HARD: triggers (public tables + auth.users -> public functions) ---"
  compare_section "triggers" "SELECT tg.tgrelid::regclass::text, tg.tgname, tg.tgenabled, tg.tgfoid::regprocedure::text, md5(pg_get_triggerdef(tg.oid)) FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid JOIN pg_proc p ON p.oid = tg.tgfoid WHERE NOT tg.tgisinternal AND (c.relnamespace = 'public'::regnamespace OR (tg.tgrelid = 'auth.users'::regclass AND p.pronamespace = 'public'::regnamespace)) ORDER BY 1, 2;"
fi

if want functions; then
  echo "--- HARD: functions (public, private) ---"
  compare_section "functions" "SELECT n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', p.prosecdef, pg_get_userbyid(p.proowner), coalesce(array_to_string(p.proconfig, ';'), ''), md5(p.prosrc) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('public', 'private') ORDER BY 1;"
fi

if want views; then
  echo "--- HARD: views (owner + definition) ---"
  compare_section "views" "SELECT c.relname, pg_get_userbyid(c.relowner), coalesce(array_to_string(c.reloptions, ','), ''), md5(pg_get_viewdef(c.oid)) FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('v','m') ORDER BY 1;"
fi

if want privileges; then
  echo "--- HARD: privileges (normalised ACLs) ---"
  compare_section "privileges-relations" "SELECT c.relname, c.relkind, $(printf "${ACL_FMT}" 'c.relacl') FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p','v','m','S') ORDER BY 1;"
  compare_section "privileges-functions" "SELECT n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', $(printf "${ACL_FMT}" 'p.proacl') FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('public', 'private') ORDER BY 1;"
  compare_section "privileges-schemas" "SELECT nspname, $(printf "${ACL_FMT}" 'nspacl') FROM pg_namespace WHERE nspname IN ('public', 'private', 'storage') ORDER BY 1;"
fi

if want extensions; then
  echo "--- HARD: extensions (names) ---"
  compare_section "extensions" "SELECT extname FROM pg_extension ORDER BY 1;"
fi

if [ -z "${ONLY}" ]; then
  echo "--- SOFT: extension versions (expected to differ across PG majors) ---"
  echo "source: $(pg_q "${SOURCE_DB_URL}" "SELECT string_agg(extname || ' ' || extversion, ', ' ORDER BY extname) FROM pg_extension;" 2>&1 | head -1)"
  echo "target: $(pg_q "${TARGET_DB_URL}" "SELECT string_agg(extname || ' ' || extversion, ', ' ORDER BY extname) FROM pg_extension;" 2>&1 | head -1)"

  echo "--- SOFT: sequence last_values (staging test writes legitimately advance some) ---"
  SEQ_SQL="SELECT coalesce(string_agg(sequencename || '=' || coalesce(last_value::text, 'null'), ', ' ORDER BY sequencename), '') FROM pg_sequences WHERE schemaname = 'public';"
  echo "source: $(pg_q "${SOURCE_DB_URL}" "${SEQ_SQL}" 2>&1 | head -1)"
  echo "target: $(pg_q "${TARGET_DB_URL}" "${SEQ_SQL}" 2>&1 | head -1)"

  echo "--- SOFT: snapshot-RPC output hashes (time-bucketed keys vary; human verdict) ---"
  for rpc in "public.get_application_insights_snapshot()" "public.get_module_discovery_snapshot()"; do
    sql="SELECT md5(coalesce(string_agg(t::text, ',' ORDER BY t::text), '')) FROM ${rpc} t;"
    echo "${rpc}: source=$(pg_q "${SOURCE_DB_URL}" "${sql}" 2>&1 | head -1) target=$(pg_q "${TARGET_DB_URL}" "${sql}" 2>&1 | head -1)"
  done
fi

if [ "${hard_fail}" -eq 0 ]; then
  echo "Deep parity HARD gates OK. Review SOFT sections above before proceeding."
else
  echo "Deep parity FAILED: ${hard_fail} HARD problem(s) above (DIFF or ERROR)." >&2
  exit 1
fi
