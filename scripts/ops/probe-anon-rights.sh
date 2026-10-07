#!/usr/bin/env bash
# H1: compare what anon / authenticated may do on hosted vs staging, then prove
# it over HTTP on the staging API.
#
# 1. Catalog (read-only on BOTH sides): effective table privileges (S/I/U/D via
#    has_table_privilege, so role memberships count), RLS on/forced, EXECUTE on
#    functions (+ SECURITY DEFINER flag), view security_invoker, policy text
#    hashes, in the API schemas. Extension members are skipped (pgjwt/pgsodium
#    differ by design). Output diffed with LC_ALL=C sort; equal = H1 catalog OK.
# 2. HTTP (staging only, refuses the hosted URL): zero-row write attempts as anon
#    on the original H1 findings (api_tiers insert/update/delete, admin RPCs).
#    Privilege checks fire at plan time, so a 401/403 proves "denied" and nothing
#    can be written even if allowed (empty insert, impossible filter).
#
#    search_path is pinned so policy/function text deparses schema-qualified on both.
#
# Usage: bash scripts/ops/with-staging-db.sh bash scripts/ops/probe-anon-rights.sh [API_URL]
#   API_URL defaults to https://supabase.patcher.xyz. Needs .env.hosted-readonly
#   (SOURCE_DB_URL) and SUPABASE_ANON_KEY in .env.
# Exit: 0 all equal / denied, 3 differences, 1 error.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
API_URL="${1:-https://supabase.patcher.xyz}"
case "${API_URL}" in *supabase.co*) echo "refusing hosted API URL" >&2; exit 1 ;; esac
if [ -z "${SOURCE_DB_URL:-}" ] && [ -f "${REPO_ROOT}/.env.hosted-readonly" ]; then
  set -a; . "${REPO_ROOT}/.env.hosted-readonly"; set +a
fi
: "${SOURCE_DB_URL:?SOURCE_DB_URL (hosted read-only) missing}"
: "${TARGET_DB_URL:?TARGET_DB_URL missing; run via with-staging-db.sh}"
ANON_KEY="$(grep -E '^SUPABASE_ANON_KEY=' "${REPO_ROOT}/.env" | cut -d= -f2- | tr -d '"')"

WORK="$(mktemp -d)"; trap 'rm -rf "${WORK}"' EXIT

read -r -d '' SQL <<'SQL' || true
WITH nsp AS (SELECT oid, nspname FROM pg_namespace WHERE nspname IN ('public', 'storage', 'graphql_public')),
ext AS (SELECT objid FROM pg_depend WHERE deptype = 'e'),
roles(r) AS (VALUES ('anon'), ('authenticated'))
SELECT line FROM (
  SELECT format('rel %s.%s kind=%s rls=%s forced=%s', n.nspname, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity) AS line
    FROM pg_class c JOIN nsp n ON n.oid = c.relnamespace
   WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f') AND c.oid NOT IN (SELECT objid FROM ext)
  UNION ALL
  SELECT format('priv %s %s.%s %s%s%s%s', r, n.nspname, c.relname,
                CASE WHEN has_table_privilege(r, c.oid, 'SELECT') THEN 'S' ELSE '-' END,
                CASE WHEN has_table_privilege(r, c.oid, 'INSERT') THEN 'I' ELSE '-' END,
                CASE WHEN has_table_privilege(r, c.oid, 'UPDATE') THEN 'U' ELSE '-' END,
                CASE WHEN has_table_privilege(r, c.oid, 'DELETE') THEN 'D' ELSE '-' END)
    FROM pg_class c JOIN nsp n ON n.oid = c.relnamespace, roles
   WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f') AND c.oid NOT IN (SELECT objid FROM ext)
  UNION ALL
  SELECT format('view %s.%s invoker=%s', n.nspname, c.relname,
                coalesce((SELECT option_value FROM pg_options_to_table(c.reloptions) WHERE option_name = 'security_invoker'), 'false'))
    FROM pg_class c JOIN nsp n ON n.oid = c.relnamespace
   WHERE c.relkind = 'v' AND c.oid NOT IN (SELECT objid FROM ext)
  UNION ALL
  SELECT format('func %s %s.%s(%s) secdef=%s exec=%s', r, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid),
                p.prosecdef, has_function_privilege(r, p.oid, 'EXECUTE'))
    FROM pg_proc p JOIN nsp n ON n.oid = p.pronamespace, roles
   WHERE p.oid NOT IN (SELECT objid FROM ext)
  UNION ALL
  SELECT format('policy %s.%s %s cmd=%s permissive=%s roles=%s qual=%s check=%s', schemaname, tablename, policyname, cmd,
                permissive, roles::text, md5(coalesce(qual, '')), md5(coalesce(with_check, '')))
    FROM pg_policies WHERE schemaname IN ('public', 'storage')
) x;
SQL

psql "${SOURCE_DB_URL}" -X -At -v ON_ERROR_STOP=1 -c "SET default_transaction_read_only = on" -c "SET search_path = pg_catalog" -c "${SQL}" \
  | LC_ALL=C sort > "${WORK}/hosted.all"
psql "${TARGET_DB_URL}" -X -At -v ON_ERROR_STOP=1 -c "SET default_transaction_read_only = on" -c "SET search_path = pg_catalog" -c "${SQL}" \
  | LC_ALL=C sort > "${WORK}/staging.all"
# Owned by service versions, reported as INFO, not compared: storage.* functions and the
# storage.iceberg_* tables (staging runs a newer storage; RLS on, no policies = no rows),
# and graphql_public.graphql (present on staging only; same grants/RLS as REST).
VERSIONED='^func [a-z_]* storage\.|storage\.iceberg_|graphql_public\.graphql\('

for side in hosted staging; do
  grep -vE "${VERSIONED}" "${WORK}/${side}.all" > "${WORK}/${side}.txt" || true
  grep -E "${VERSIONED}" "${WORK}/${side}.all" > "${WORK}/${side}.storage" || true
done

status=0
echo "== catalog: anon/authenticated rights, hosted vs staging"
printf 'lines: hosted %s, staging %s\n' "$(wc -l < "${WORK}/hosted.txt" | tr -d ' ')" "$(wc -l < "${WORK}/staging.txt" | tr -d ' ')"
if diff -q "${WORK}/hosted.txt" "${WORK}/staging.txt" >/dev/null; then
  echo "OK    identical"
else
  echo "DIFF  (< hosted only, > staging only)"
  { diff "${WORK}/hosted.txt" "${WORK}/staging.txt" || true; } | grep -E '^[<>]' | head -60
  status=3
fi
if ! diff -q "${WORK}/hosted.storage" "${WORK}/staging.storage" >/dev/null; then
  echo "INFO  service-version objects differ (storage funcs, iceberg tables, graphql): $({ diff "${WORK}/hosted.storage" "${WORK}/staging.storage" || true; } | grep -c '^[<>]') lines"
fi
echo "summary (staging): anon-executable SECURITY DEFINER functions in public: $(grep -c '^func anon public\..* secdef=true exec=true' "${WORK}/staging.txt" || true)"

echo "== HTTP: zero-row anon write attempts on ${API_URL}"
H=(-H "apikey: ${ANON_KEY}" -H "Authorization: Bearer ${ANON_KEY}" -H "Content-Type: application/json")
c() { curl -s -o "${WORK}/body" -w '%{http_code}' -m 20 "$@"; }
check() { # label code
  case "$2" in
    401|403|404) printf 'OK    %-44s %s denied\n' "$1" "$2" ;;
    *) printf 'FAIL  %-44s %s %s\n' "$1" "$2" "$(head -c 160 "${WORK}/body")"; status=3 ;;
  esac
}
check "api_tiers insert (empty)" "$(c "${H[@]}" -X POST -d '[]' "${API_URL}/rest/v1/api_tiers")"
check "api_tiers update (no row matches)" "$(c "${H[@]}" -X PATCH -d '{}' "${API_URL}/rest/v1/api_tiers?code=is.null&code=not.is.null")"
check "api_tiers delete (no row matches)" "$(c "${H[@]}" -X DELETE "${API_URL}/rest/v1/api_tiers?code=is.null&code=not.is.null")"
for fn in create_api_key refresh_module_discovery_snapshot record_api_key_usage; do
  # Only call when the catalog says anon can NOT execute it; otherwise the call could do work.
  if grep -q "^func anon public\.${fn}(.*exec=true" "${WORK}/staging.txt"; then
    printf 'SKIP  %-44s anon has EXECUTE (matches hosted only if catalog OK)\n' "rpc ${fn}"
  else
    check "rpc ${fn}" "$(c "${H[@]}" -X POST -d '{}' "${API_URL}/rest/v1/rpc/${fn}")"
  fi
done
exit "${status}"
