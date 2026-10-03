#!/usr/bin/env bash
#
# Write freeze for the `public` schema via statement-level reject triggers.
#
#   on      One transaction (SET LOCAL lock_timeout; the whole transaction is
#           retried on lock timeout, never left partial): create-or-replace
#           private.patcher_freeze_reject() and put a
#             zz_patcher_freeze BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE
#             ... FOR EACH STATEMENT
#           trigger on EVERY base table in `public` (relkind r/p, from the
#           catalog). Idempotent; repairs a disabled/mis-defined trigger.
#   off     One transaction: drop every zz_patcher_freeze trigger in `public`
#           and the function. Idempotent.
#   status  (a) catalog: every public base table has zz_patcher_freeze,
#           origin-enabled (tgenabled='O'), statement-level B/I/U/D/T, calling
#           the function; (b) behavioural probe in a transaction that is ALWAYS
#           rolled back: as `authenticated` and `service_role`, inside an
#           explicit BEGIN READ WRITE, INSERT/UPDATE/DELETE/TRUNCATE on a public
#           table must fail with the freeze error; a session with
#           session_replication_role = replica must pass the trigger.
#           Exit 0 FROZEN, 3 NOT FROZEN, 4 PARTIAL (incl. inconclusive probe).
#
# Why triggers, not a GUC: default_transaction_read_only is USERSET, so
# BEGIN READ WRITE (which PostgREST uses) bypasses it. A GUC layer is
# deliberately NOT used. Origin-enabled triggers fire for every role and path
# (PostgREST, SECURITY DEFINER RPCs, pg_cron, service key, RI cascades into
# public tables) and are skipped only by session_replication_role = replica —
# which is how the sync session passes the freeze by design.
#
# KNOWN GAP: any role allowed to set session_replication_role (superusers; on
# hosted, `postgres` via the dashboard SQL editor or anything holding the DB
# URL) can bypass the freeze. auth.* and storage.* are not frozen by this tool.
#
# Guards: if TARGET_DB_URL looks hosted OR lacks the patcher_selfhost_marker
# role, EVERY subcommand (including status — its probe is a rolled-back write
# attempt) requires --target-is-hosted AND typing "FREEZE HOSTED" on the
# terminal. CONFIRM_PHRASE env replaces the prompt for drills/tests only.
# Connection strings are never printed unmasked.
#
# Usage:
#   TARGET_DB_URL=... bash scripts/ops/write-freeze.sh on|off|status [--target-is-hosted] [--probe-table NAME]
# Env: FREEZE_LOCK_RETRIES (default 5), FREEZE_LOCK_TIMEOUT (default 3s).

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/pg-common.sh
source "${SCRIPT_DIR}/lib/pg-common.sh"
# shellcheck source=lib/hosted-confirm.sh
source "${SCRIPT_DIR}/lib/hosted-confirm.sh"

CONFIRM="FREEZE HOSTED"
RETRIES="${FREEZE_LOCK_RETRIES:-5}"
LOCK_TIMEOUT="${FREEZE_LOCK_TIMEOUT:-3s}"

usage() { sed -n '2,42p' "$0" | sed 's/^# \{0,1\}//'; }

cmd="${1:-}"
[ $# -gt 0 ] && shift
case "${cmd}" in
  -h|--help) usage; exit 0 ;;
  on|off|status) ;;
  "") usage >&2; exit 1 ;;
  *) echo "ERROR: unknown command: ${cmd}" >&2; usage >&2; exit 1 ;;
esac

hosted_flag=0 probe_table=""
while [ $# -gt 0 ]; do
  case "$1" in
    --target-is-hosted) hosted_flag=1; shift ;;
    --probe-table) probe_table="${2:-}"; [ -n "${probe_table}" ] || { echo "ERROR: --probe-table needs a name." >&2; exit 1; }; shift 2 ;;
    *) echo "ERROR: unknown argument: $1" >&2; exit 1 ;;
  esac
done
case "${LOCK_TIMEOUT}" in *[!0-9a-z]*|"") echo "ERROR: bad FREEZE_LOCK_TIMEOUT." >&2; exit 1 ;; esac
case "${RETRIES}" in ''|*[!0-9]*) echo "ERROR: bad FREEZE_LOCK_RETRIES." >&2; exit 1 ;; esac

command -v psql >/dev/null 2>&1 || { echo "ERROR: required command not found: psql" >&2; exit 1; }
[ -n "${TARGET_DB_URL:-}" ] || { echo "ERROR: TARGET_DB_URL must be set in the shell (never commit it)." >&2; exit 1; }

confirm_target_or_exit "${TARGET_DB_URL}" "${CONFIRM}" "${hosted_flag}"

# Catalog predicate for a correct freeze trigger. tgtype 62 = BEFORE(2) |
# INSERT(4) | DELETE(8) | UPDATE(16) | TRUNCATE(32), statement level (no ROW bit).
TRIGGER_OK="tg.tgenabled = 'O' AND tg.tgtype = 62 AND tg.tgfoid = to_regprocedure('private.patcher_freeze_reject()')"

ON_SQL="$(cat <<SQL
\\set ON_ERROR_STOP 1
\\set VERBOSITY verbose
\\set SHOW_CONTEXT never
BEGIN;
SET LOCAL lock_timeout = '${LOCK_TIMEOUT}';
SET LOCAL search_path = pg_catalog;
CREATE OR REPLACE FUNCTION private.patcher_freeze_reject()
  RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS \$fn\$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'read_only_sql_transaction',
    MESSAGE = format('patcher write freeze: %s on %I.%I is rejected', TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME),
    HINT = 'Maintenance write freeze is active (scripts/ops/write-freeze.sh). Retry after it is lifted.';
END
\$fn\$;
COMMENT ON FUNCTION private.patcher_freeze_reject() IS 'Patcher maintenance write freeze (scripts/ops/write-freeze.sh). Temporary; removed by write-freeze.sh off.';
REVOKE ALL ON FUNCTION private.patcher_freeze_reject() FROM PUBLIC;
DO \$do\$
DECLARE
  r record; t record; created int := 0; repaired int := 0; kept int := 0;
  fn oid := 'private.patcher_freeze_reject()'::regprocedure;
BEGIN
  FOR r IN SELECT c.oid, c.relname FROM pg_class c
           WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p')
           ORDER BY c.relname LOOP
    SELECT tg.tgenabled, tg.tgtype, tg.tgfoid INTO t FROM pg_trigger tg
      WHERE tg.tgrelid = r.oid AND tg.tgname = 'zz_patcher_freeze';
    IF FOUND THEN
      IF t.tgenabled = 'O' AND t.tgtype = 62 AND t.tgfoid = fn THEN
        kept := kept + 1; CONTINUE;
      END IF;
      EXECUTE format('DROP TRIGGER zz_patcher_freeze ON public.%I', r.relname);
      repaired := repaired + 1;
    ELSE
      created := created + 1;
    END IF;
    EXECUTE format('CREATE TRIGGER zz_patcher_freeze BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION private.patcher_freeze_reject()', r.relname);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p')
             AND NOT EXISTS (SELECT 1 FROM pg_trigger tg WHERE tg.tgrelid = c.oid AND tg.tgname = 'zz_patcher_freeze' AND ${TRIGGER_OK})) THEN
    RAISE EXCEPTION 'freeze self-check failed: a public base table lacks a valid zz_patcher_freeze';
  END IF;
  RAISE NOTICE 'FREEZE|tables=%|created=%|repaired=%|already=%', created + repaired + kept, created, repaired, kept;
END
\$do\$;
COMMIT;
SQL
)"

OFF_SQL="$(cat <<SQL
\\set ON_ERROR_STOP 1
\\set VERBOSITY verbose
\\set SHOW_CONTEXT never
BEGIN;
SET LOCAL lock_timeout = '${LOCK_TIMEOUT}';
SET LOCAL search_path = pg_catalog;
DO \$do\$
DECLARE r record; dropped int := 0;
BEGIN
  FOR r IN SELECT c.relname FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid
           WHERE c.relnamespace = 'public'::regnamespace AND tg.tgname = 'zz_patcher_freeze'
           ORDER BY c.relname LOOP
    EXECUTE format('DROP TRIGGER zz_patcher_freeze ON public.%I', r.relname);
    dropped := dropped + 1;
  END LOOP;
  RAISE NOTICE 'UNFREEZE|dropped=%', dropped;
END
\$do\$;
-- No CASCADE: fails loudly if anything outside public still uses the function.
DROP FUNCTION IF EXISTS private.patcher_freeze_reject();
COMMIT;
SQL
)"

run_with_retry() {
  local label="$1" sql="$2" attempt=1 out rc
  while :; do
    rc=0
    out="$(printf '%s\n' "${sql}" | psql "${TARGET_DB_URL}" -X -q 2>&1)" || rc=$?
    if [ "${rc}" -eq 0 ]; then
      grep -E 'NOTICE: +([0-9A-Z]{5}: )?(UN)?FREEZE\|' <<< "${out}" | sed -E 's/.*NOTICE: +([0-9A-Z]{5}: )?//' || true
      return 0
    fi
    if grep -q '55P03' <<< "${out}" && [ "${attempt}" -le "${RETRIES}" ]; then
      echo "${label}: lock timeout (attempt ${attempt}/$((RETRIES + 1))); whole transaction rolled back, retrying..." >&2
      sleep $((attempt * 2)); attempt=$((attempt + 1)); continue
    fi
    echo "${label}: FAILED — the transaction was rolled back, nothing changed." >&2
    grep -E 'ERROR|DETAIL|HINT' <<< "${out}" | head -10 >&2 || true
    return 1
  done
}

if [ "${cmd}" = "on" ]; then
  run_with_retry "freeze on" "${ON_SQL}" || exit 1
  echo "Write freeze ON. Verify: bash scripts/ops/write-freeze.sh status"
  exit 0
fi
if [ "${cmd}" = "off" ]; then
  run_with_retry "freeze off" "${OFF_SQL}" || exit 1
  echo "Write freeze OFF."
  exit 0
fi

# ---------------------------------------------------------------- status
CATALOG_SQL="SELECT c.relname || '|' || CASE
    WHEN tg.oid IS NULL THEN 'missing'
    WHEN ${TRIGGER_OK} THEN 'ok'
    WHEN tg.tgenabled <> 'O' THEN 'enabled=' || tg.tgenabled::text
    ELSE 'misdefined' END
  FROM pg_class c LEFT JOIN pg_trigger tg ON tg.tgrelid = c.oid AND tg.tgname = 'zz_patcher_freeze'
  WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p') ORDER BY 1;"
catalog="$(pg_q "${TARGET_DB_URL}" "${CATALOG_SQL}")" || { echo "ERROR: catalog query failed." >&2; exit 1; }
total="$(grep -c . <<< "${catalog}" || true)"
ok="$(grep -c '|ok$' <<< "${catalog}" || true)"
echo "--- catalog: ${ok}/${total} public base tables carry a valid zz_patcher_freeze ---"
if [ "${ok}" -ne "${total}" ] && [ "${ok}" -gt 0 ]; then
  grep -v '|ok$' <<< "${catalog}" | sed 's/^/  not frozen: /; s/|/  /'
fi

# Behavioural probe. Everything runs in ONE transaction that ends in ROLLBACK;
# each attempt also runs in its own subtransaction undone by a sentinel, so
# even a non-frozen write is reverted before the next attempt.
PROBE_SQL="$(cat <<'SQL'
\set ON_ERROR_STOP 1
\set VERBOSITY terse
BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
SELECT set_config('patcher.probe_table', :'probe_table', true) \gset
DO $probe$
DECLARE
  roles text[] := ARRAY(SELECT r FROM unnest(ARRAY['authenticated','service_role']) r
                        WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r));
  want text := current_setting('patcher.probe_table', true);
  tbl regclass; qtbl text; col text; role text; op text; stmt text; ok boolean;
BEGIN
  IF coalesce(want, '') <> '' THEN
    tbl := to_regclass(format('public.%I', want));
    IF tbl IS NULL THEN RAISE EXCEPTION 'probe table public.% not found', want; END IF;
  ELSE
    -- A leaf table (nothing references it, so TRUNCATE reaches the trigger
    -- instead of the FK check), preferring one every probe role may write.
    SELECT c.oid INTO tbl FROM pg_class c
     WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
       AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.confrelid = c.oid AND k.contype = 'f')
     ORDER BY (SELECT count(*) FROM unnest(roles) r, unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE']) p
               WHERE has_table_privilege(r, c.oid, p)) DESC, c.relname
     LIMIT 1;
    IF tbl IS NULL THEN RAISE EXCEPTION 'no leaf public table to probe'; END IF;
  END IF;
  -- Schema-qualified text: probe roles may run with a search_path that misses public.
  qtbl := format('%I.%I', (SELECT nspname FROM pg_namespace WHERE oid = (SELECT relnamespace FROM pg_class WHERE oid = tbl)),
                          (SELECT relname FROM pg_class WHERE oid = tbl));
  SELECT quote_ident(a.attname) INTO col FROM pg_attribute a
   WHERE a.attrelid = tbl AND a.attnum > 0 AND NOT a.attisdropped
     AND a.attgenerated = '' AND a.attidentity <> 'a'
   ORDER BY a.attnum LIMIT 1;
  RAISE NOTICE 'PROBE|table|%', qtbl;
  FOREACH role IN ARRAY roles LOOP
    FOREACH op IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE'] LOOP
      stmt := CASE op
        WHEN 'INSERT' THEN format('INSERT INTO %s (%s) SELECT NULL WHERE false', qtbl, col)
        WHEN 'UPDATE' THEN format('UPDATE %s SET %s = %s WHERE false', qtbl, col, col)
        WHEN 'DELETE' THEN format('DELETE FROM %s WHERE false', qtbl)
        ELSE format('TRUNCATE %s', qtbl) END;
      BEGIN
        EXECUTE format('SET LOCAL ROLE %I', role);
        EXECUTE stmt;
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'patcher-probe-sentinel';
      EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'patcher-probe-sentinel' THEN
          RAISE NOTICE 'PROBE|%|%|PASSED|write went through (undone)', role, op;
        ELSIF SQLSTATE = '25006' AND SQLERRM LIKE 'patcher write freeze:%' THEN
          RAISE NOTICE 'PROBE|%|%|FREEZE|%', role, op, SQLERRM;
        ELSIF SQLSTATE = '42501' THEN
          RAISE NOTICE 'PROBE|%|%|DENIED|%', role, op, SQLERRM;
        ELSE
          RAISE NOTICE 'PROBE|%|%|OTHER|% %', role, op, SQLSTATE, SQLERRM;
        END IF;
      END;
    END LOOP;
  END LOOP;
  -- Replica-mode session (the sync path) must pass the trigger.
  BEGIN
    SET LOCAL session_replication_role = replica;
    EXECUTE format('INSERT INTO %s (%s) SELECT NULL WHERE false', qtbl, col);
    EXECUTE format('UPDATE %s SET %s = %s WHERE false', qtbl, col, col);
    EXECUTE format('DELETE FROM %s WHERE false', qtbl);
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'patcher-probe-sentinel';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'patcher-probe-sentinel' THEN
      RAISE NOTICE 'REPLICA|PASSES|% in replica mode: INSERT/UPDATE/DELETE pass the trigger (undone)', current_user;
    ELSE
      RAISE NOTICE 'REPLICA|BLOCKED|% %', SQLSTATE, SQLERRM;
    END IF;
  END;
END
$probe$;
ROLLBACK;
SQL
)"
prc=0
probe_out="$(printf '%s\n' "${PROBE_SQL}" | psql "${TARGET_DB_URL}" -X -q -v probe_table="${probe_table}" 2>&1)" || prc=$?
if [ "${prc}" -ne 0 ]; then
  echo "--- probe: FAILED to run (rolled back) ---"
  grep -E 'ERROR' <<< "${probe_out}" | head -5 | sed 's/^/  /'
fi
lines="$(grep -E 'NOTICE: +(PROBE|REPLICA)\|' <<< "${probe_out}" | sed -E 's/.*NOTICE: +//' || true)"
echo "--- probe (BEGIN READ WRITE, always rolled back) on $(grep '^PROBE|table|' <<< "${lines}" | cut -d'|' -f3) ---"
grep -E '^PROBE\|[^|]+\|(INSERT|UPDATE|DELETE|TRUNCATE)\|' <<< "${lines}" \
  | awk -F'|' '{ printf "  %-14s %-9s %-7s %s\n", $2, $3, $4, $5 }' || true
grep '^REPLICA|' <<< "${lines}" | awk -F'|' '{ printf "  replica-mode   %-7s %s\n", $2, $3 }' || true

count() { grep -cE "^PROBE\|[^|]+\|[A-Z]+\|$1\|" <<< "${lines}" || true; }
n_freeze="$(count FREEZE)"; n_pass="$(count PASSED)"; n_other="$(count OTHER)"
roles_frozen="$(grep -E '^PROBE\|[^|]+\|[A-Z]+\|FREEZE\|' <<< "${lines}" | cut -d'|' -f2 | sort -u | grep -c . || true)"
roles_seen="$(grep -E '^PROBE\|[^|]+\|(INSERT|UPDATE|DELETE|TRUNCATE)\|' <<< "${lines}" | cut -d'|' -f2 | sort -u | grep -c . || true)"
if grep -q '^REPLICA|BLOCKED' <<< "${lines}"; then
  echo "WARNING: replica-mode session did not pass (sync path cannot pass the freeze from this role)."
fi

if [ "${prc}" -eq 0 ] && [ "${total}" -gt 0 ] && [ "${ok}" -eq "${total}" ] && [ "${n_pass}" -eq 0 ] \
   && [ "${n_other}" -eq 0 ] && [ "${roles_seen}" -gt 0 ] && [ "${roles_frozen}" -eq "${roles_seen}" ]; then
  echo "STATUS: FROZEN"; exit 0
fi
if [ "${prc}" -eq 0 ] && [ "${ok}" -eq 0 ] && [ "${n_freeze}" -eq 0 ] && [ "${n_other}" -eq 0 ]; then
  echo "STATUS: NOT FROZEN"; exit 3
fi
echo "STATUS: PARTIAL (catalog ${ok}/${total}; probe freeze=${n_freeze} passed=${n_pass} other=${n_other}) — re-run 'on' or 'off'"
exit 4
