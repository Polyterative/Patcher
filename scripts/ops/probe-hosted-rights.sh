#!/usr/bin/env bash
#
# Probe whether the login in TARGET_DB_URL holds every right the rollback
# tooling needs on that database (delta-sync.mjs apply --direction reverse,
# write-freeze.sh). Pre-cutover exit gate: run once against hosted, owner
# present, and paste the table into the self-host checklist.
#
# Everything runs inside ONE transaction that always ends in ROLLBACK, each
# check in its own subtransaction. It changes nothing — but it IS a write
# attempt (locks, xids, DDL that is rolled back) on the target, so on hosted it
# is owner-run only: hosted-looking or marker-less targets need
# --target-is-hosted and the typed phrase "PROBE HOSTED".
#
# Checks: server/GoTrue versions + superuser; SET session_replication_role =
# replica; ownership of every public base table; LOCK ... IN EXCLUSIVE MODE
# NOWAIT on every table the apply locks; DELETE/INSERT (privilege + a real
# zero-row statement) on the auth tables it merges or empties; CREATE FUNCTION
# in private + CREATE TRIGGER on a public table (the freeze); DML on
# storage.objects (owner fix-up option); triggers on auth.users (legacy
# handle_new_profile_poly?); storage policies that reference owner.
#
# Usage:
#   TARGET_DB_URL=... bash scripts/ops/probe-hosted-rights.sh [--target-is-hosted]
# Exit: 0 every required check passed, 3 at least one FAIL, 1 error/refused.

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/pg-common.sh
source "${SCRIPT_DIR}/lib/pg-common.sh"
# shellcheck source=lib/hosted-confirm.sh
source "${SCRIPT_DIR}/lib/hosted-confirm.sh"

hosted_flag=0
for arg in "$@"; do
  case "${arg}" in
    --target-is-hosted) hosted_flag=1 ;;
    -h|--help) sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "ERROR: unknown argument: ${arg}" >&2; exit 1 ;;
  esac
done
command -v psql >/dev/null 2>&1 || { echo "ERROR: required command not found: psql" >&2; exit 1; }
[ -n "${TARGET_DB_URL:-}" ] || { echo "ERROR: TARGET_DB_URL must be set in the shell (never commit it)." >&2; exit 1; }
confirm_target_or_exit "${TARGET_DB_URL}" "PROBE HOSTED" "${hosted_flag}"

PROBE_SQL="$(cat <<'SQL'
\set ON_ERROR_STOP 1
\set VERBOSITY terse
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
DO $probe$
DECLARE
  merge_tables text[] := ARRAY['auth.users', 'auth.identities', 'auth.mfa_factors'];
  wipe_tables  text[] := ARRAY['auth.mfa_challenges', 'auth.mfa_amr_claims', 'auth.refresh_tokens',
                               'auth.sessions', 'auth.one_time_tokens', 'auth.flow_state'];
  t text; r record; n bigint; lst text; probe_tbl text;
BEGIN
  -- info -----------------------------------------------------------------
  RAISE NOTICE 'ROW|info|server version|INFO|%', current_setting('server_version');
  RAISE NOTICE 'ROW|info|login / superuser|INFO|% / %', current_user,
    (SELECT rolsuper FROM pg_roles WHERE rolname = current_user);
  IF to_regclass('auth.schema_migrations') IS NOT NULL THEN
    EXECUTE 'SELECT max(version)::text FROM auth.schema_migrations' INTO lst;
    RAISE NOTICE 'ROW|info|GoTrue schema version|INFO|%', lst;
  END IF;

  -- replica mode (main rollback path) -------------------------------------
  BEGIN
    SET LOCAL session_replication_role = replica;
    RAISE EXCEPTION USING MESSAGE = 'probe-sentinel';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'probe-sentinel' THEN
      RAISE NOTICE 'ROW|required|SET session_replication_role = replica|PASS|main path available';
    ELSE
      RAISE NOTICE 'ROW|required|SET session_replication_role = replica|FAIL|% — use the keyed fallback path', SQLERRM;
    END IF;
  END;

  -- ownership of public base tables (freeze DDL, DISABLE TRIGGER USER) ----
  SELECT count(*), string_agg(c.relname || '(' || pg_get_userbyid(c.relowner) || ')', ', ' ORDER BY c.relname)
    INTO n, lst
    FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p')
     AND NOT pg_has_role(current_user, c.relowner, 'USAGE');
  IF n = 0 THEN
    RAISE NOTICE 'ROW|required|owns every public base table|PASS|';
  ELSE
    RAISE NOTICE 'ROW|required|owns every public base table|FAIL|% not owned: %', n, left(lst, 300);
  END IF;

  -- EXCLUSIVE locks on everything the apply locks -------------------------
  BEGIN
  FOR t IN SELECT format('%I.%I', 'public', relname) FROM pg_class
            WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r','p')
           UNION ALL SELECT x FROM unnest(merge_tables || wipe_tables) x WHERE to_regclass(x) IS NOT NULL LOOP
    BEGIN
      EXECUTE format('LOCK TABLE %s IN EXCLUSIVE MODE NOWAIT', t);
      RAISE EXCEPTION USING MESSAGE = 'probe-sentinel';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'probe-sentinel' THEN
        RAISE NOTICE 'ROW|required|LOCK EXCLUSIVE %|FAIL|%', t, SQLERRM;
      END IF;
    END;
  END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ROW|required|LOCK EXCLUSIVE (table list)|FAIL|%', SQLERRM;
  END;
  RAISE NOTICE 'ROW|required|LOCK EXCLUSIVE (all apply tables)|DONE|failures listed separately';

  -- auth DML ---------------------------------------------------------------
  FOREACH t IN ARRAY merge_tables || wipe_tables LOOP
    BEGIN
      IF to_regclass(t) IS NULL THEN
        RAISE NOTICE 'ROW|required|DELETE on %|SKIP|table does not exist', t;
        CONTINUE;
      END IF;
      EXECUTE format('DELETE FROM %s WHERE false', t);
      RAISE EXCEPTION USING MESSAGE = 'probe-sentinel';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'probe-sentinel' THEN
        RAISE NOTICE 'ROW|required|DELETE on %|PASS|', t;
      ELSE
        RAISE NOTICE 'ROW|required|DELETE on %|FAIL|%', t, SQLERRM;
      END IF;
    END;
  END LOOP;
  FOREACH t IN ARRAY merge_tables LOOP
    BEGIN
      CONTINUE WHEN to_regclass(t) IS NULL;
      EXECUTE format('INSERT INTO %s SELECT * FROM %s WHERE false', t, t);
      RAISE EXCEPTION USING MESSAGE = 'probe-sentinel';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'probe-sentinel' THEN
        RAISE NOTICE 'ROW|required|INSERT on %|PASS|', t;
      ELSIF SQLSTATE = '428C9' THEN -- generated column in SELECT *: privilege is what matters here
        RAISE NOTICE 'ROW|required|INSERT on %|%|privilege check (generated columns)', t,
          CASE WHEN has_table_privilege(t, 'INSERT') THEN 'PASS' ELSE 'FAIL' END;
      ELSE
        RAISE NOTICE 'ROW|required|INSERT on %|FAIL|%', t, SQLERRM;
      END IF;
    END;
  END LOOP;

  -- freeze DDL: function in private + statement trigger on a public table --
  SELECT format('%I.%I', 'public', relname) INTO probe_tbl FROM pg_class
   WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' ORDER BY relname LIMIT 1;
  BEGIN
    CREATE FUNCTION private.zz_patcher_rights_probe() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NULL; END';
    EXECUTE format('CREATE TRIGGER zz_patcher_rights_probe BEFORE INSERT ON %s FOR EACH STATEMENT EXECUTE FUNCTION private.zz_patcher_rights_probe()', probe_tbl);
    RAISE EXCEPTION USING MESSAGE = 'probe-sentinel';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'probe-sentinel' THEN
      RAISE NOTICE 'ROW|required|CREATE FUNCTION in private + CREATE TRIGGER on public|PASS|write freeze possible';
    ELSE
      RAISE NOTICE 'ROW|required|CREATE FUNCTION in private + CREATE TRIGGER on public|FAIL|%', SQLERRM;
    END IF;
  END;

  -- storage.objects DML (owner fix-up option, R8) --------------------------
  BEGIN
    IF to_regclass('storage.objects') IS NOT NULL THEN
      RAISE NOTICE 'ROW|optional|UPDATE on storage.objects|%|owner fix-up after API uploads',
        CASE WHEN has_table_privilege('storage.objects', 'UPDATE') THEN 'PASS' ELSE 'FAIL' END;
      SELECT count(*), string_agg(policyname, ', ' ORDER BY policyname) INTO n, lst
        FROM pg_policies WHERE schemaname = 'storage'
         AND (coalesce(qual, '') ~ '\mowner' OR coalesce(with_check, '') ~ '\mowner');
      RAISE NOTICE 'ROW|info|storage policies referencing owner|INFO|% %', n, coalesce('(' || lst || ')', '');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ROW|optional|UPDATE on storage.objects|FAIL|%', SQLERRM;
  END;

  -- triggers on auth.users (legacy handle_new_profile_poly?) ---------------
  BEGIN
    IF to_regclass('auth.users') IS NOT NULL THEN
      SELECT string_agg(tg.tgname || ' -> ' || tg.tgfoid::regprocedure::text || ' [' || tg.tgenabled::text || ']', '; ' ORDER BY tg.tgname)
        INTO lst FROM pg_trigger tg WHERE tg.tgrelid = 'auth.users'::regclass AND NOT tg.tgisinternal;
      RAISE NOTICE 'ROW|info|triggers on auth.users|INFO|%', coalesce(lst, 'none');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ROW|info|triggers on auth.users|INFO|unreadable: %', SQLERRM;
  END;
END
$probe$;
ROLLBACK;
SQL
)"

rc=0
out="$(printf '%s\n' "${PROBE_SQL}" | psql "${TARGET_DB_URL}" -X -q 2>&1)" || rc=$?
if [ "${rc}" -ne 0 ]; then
  echo "ERROR: probe failed to run (rolled back, nothing changed):" >&2
  grep -E 'ERROR' <<< "${out}" | head -5 >&2
  exit 1
fi
rows="$(grep -E 'NOTICE: +ROW\|' <<< "${out}" | sed -E 's/.*NOTICE: +ROW\|//')"
echo
echo "| kind | check | result | detail |"
echo "|---|---|---|---|"
awk -F'|' '{ d=$4; for (i=5;i<=NF;i++) d=d"|"$i; printf "| %s | %s | %s | %s |\n", $1, $2, $3, d }' <<< "${rows}"
echo
echo "Probed $(date -u +%Y-%m-%dT%H:%MZ) on $(mask_db_url "${TARGET_DB_URL}") — transaction rolled back, nothing changed."
if grep -q '^required|[^|]*|FAIL|' <<< "${rows}"; then
  echo "RESULT: at least one required right is missing (see FAIL rows)."; exit 3
fi
echo "RESULT: every required right is present."
