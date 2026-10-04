#!/usr/bin/env bash
#
# Recreate the hosted-only backend pieces on the self-host stack (runbook §9.1-9.2):
# the snapshot-store-listings Edge Function, its runtime token, pg_cron and both
# hosted cron jobs. Owner-run from the repo root on the Mac; everything happens on
# the NAS over `ssh NAS`. Hosted is never contacted.
#
#   (no flag)   dry run: read-only checks + the plan, writes nothing
#   --apply     execute (idempotent; re-running converges)
#
# What --apply does, in order:
#   1. Refuses unless the DB has the patcher_selfhost_marker role.
#   2. Backs up .env, docker-compose.yml, volumes/functions/main/index.ts (*.bak-<ts>).
#   3. .env: adds PRICE_HUB_SNAPSHOT_TOKEN (fresh random hex, generated on the NAS,
#      never printed) if absent. A NEW token is correct at cutover too: the cron
#      Bearer and the runtime env both live on self-host, they only have to match
#      each other.
#   4. docker-compose.yml (functions service): passes PRICE_HUB_SNAPSHOT_TOKEN into
#      the container. NOTE: upstream update.sh rewrites this file — re-apply after
#      every self-hosted/v* bump (update policy).
#   5. volumes/functions/main/index.ts: user-worker timeout 60 s -> 150 s. The
#      function budgets 110 s (RUNTIME_BUDGET_MS) and hosted allows 150 s wall
#      clock; the stock 60 s router kills a limit=20 run halfway. Same caveat as 4.
#      Also adds the slug guards (main/_shared/dotfiles/unknown -> 404, not a 500
#      echoing internal paths) and removes the upstream sample `hello` and macOS
#      `._*` files (hardening H3).
#   6. Copies supabase/functions/snapshot-store-listings + _shared verbatim.
#   7. Recreates only the functions container (compose project <compose-project>).
#   8. DB (one transaction, ON_ERROR_STOP): pg_cron in schema extensions (as the
#      hosted migrations do); Vault secret price_hub_snapshot_token = runtime token
#      (create or update; passed via env + \getenv, never on a command line);
#      job refresh-module-discovery-snapshot ('17 * * * *', verbatim from
#      20260616155154) and job snapshot-store-listings-every-three-days
#      ('0 0 */3 * *', URL rewritten to http://api-gw:8000 — the gateway's compose
#      name, resolvable from supabase-db).
#      On staging the snapshot job is left INACTIVE so staging does not double the
#      third-party store traffic; pass --snapshot-job-active at cutover.
#   9. Verify: unauthenticated call -> 401 (function loaded + token present), one
#      authorised limit=1 run -> 200 with one listing processed, discovery refresh
#      runs, cron.job rows listed.
#
# Not done here (owner, server-side only): Vault api_key_pepper — it must be the
# hosted value verbatim (rotation invalidates every external API key), so it is
# created in the cutover window, never from a generated value.
#
# Env: SSH_HOST (default NAS), PROJECT_DIR (default
#      <project-dir>), APP_COMPOSE (NAS rendered compose).

set -euo pipefail

SSH_HOST="${SSH_HOST:-NAS}"
PROJECT_DIR="${PROJECT_DIR:-<project-dir>}"
APP_COMPOSE="${APP_COMPOSE:-<app-compose>}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

APPLY=0
JOB_ACTIVE=false
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --snapshot-job-active) JOB_ACTIVE=true ;;
    -h|--help) sed -n '2,48p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done

for d in snapshot-store-listings _shared; do
  [ -d "$REPO_ROOT/supabase/functions/$d" ] || { echo "missing supabase/functions/$d" >&2; exit 1; }
done

remote() { ssh "$SSH_HOST" "PROJECT_DIR='$PROJECT_DIR' APP_COMPOSE='$APP_COMPOSE' JOB_ACTIVE='$JOB_ACTIVE' bash -s" ; }

echo "== read-only checks on $SSH_HOST"
remote <<'EOF'
set -euo pipefail
cd "$PROJECT_DIR"
q() { docker exec supabase-db psql -U supabase_admin -d postgres -AtX -v ON_ERROR_STOP=1 -c "$1"; }
echo "marker role:        $(q "select count(*) from pg_roles where rolname='patcher_selfhost_marker'")"
echo "pg_cron installed:  $(q "select count(*) from pg_extension where extname='pg_cron'")"
echo "pg_net installed:   $(q "select count(*) from pg_extension where extname='pg_net'")"
echo "vault token secret: $(q "select count(*) from vault.secrets where name='price_hub_snapshot_token'")"
echo "vault pepper:       $(q "select count(*) from vault.secrets where name='api_key_pepper'") (owner, cutover window)"
echo "token in .env:      $(grep -c '^PRICE_HUB_SNAPSHOT_TOKEN=' .env || true)"
echo "token in compose:   $(grep -c 'PRICE_HUB_SNAPSHOT_TOKEN' docker-compose.yml || true)"
echo "router timeout:     $(grep -o 'const workerTimeoutMs = [^/]*' volumes/functions/main/index.ts)"
echo "function on disk:   $(test -f volumes/functions/snapshot-store-listings/index.ts && echo yes || echo no)"
echo "api-gw from db:     $(docker exec supabase-db getent hosts api-gw | awk '{print $1}')"
test -f "$APP_COMPOSE" && echo "app compose:        ok" || { echo "app compose missing: $APP_COMPOSE"; exit 1; }
EOF

if [ "$APPLY" -ne 1 ]; then
  echo "dry run: nothing written. Re-run with --apply (snapshot job active=$JOB_ACTIVE)."
  exit 0
fi

echo "== copying function sources"
remote <<'EOF'
set -euo pipefail
[ "$(docker exec supabase-db psql -U supabase_admin -d postgres -AtX -c "select count(*) from pg_roles where rolname='patcher_selfhost_marker'")" = 1 ] \
  || { echo "REFUSED: patcher_selfhost_marker role missing — not a self-host target" >&2; exit 1; }
cd "$PROJECT_DIR"
ts=$(date +%Y%m%d-%H%M%S)
cp -p .env ".env.bak-$ts"
cp -p docker-compose.yml "docker-compose.yml.bak-$ts"
cp -p volumes/functions/main/index.ts "volumes/functions/main/index.ts.bak-$ts"
echo "backups: *.bak-$ts"
if ! grep -q '^PRICE_HUB_SNAPSHOT_TOKEN=' .env; then
  printf '\n# Patcher snapshot worker token; the pg_cron Bearer (Vault) must equal it\nPRICE_HUB_SNAPSHOT_TOKEN=%s\n' "$(openssl rand -hex 32)" >> .env
  echo ".env: token added"
fi
if ! grep -q 'PRICE_HUB_SNAPSHOT_TOKEN' docker-compose.yml; then
  sed -i '/^      SUPABASE_DB_URL: postgresql:\/\/postgres:\${POSTGRES_PASSWORD}/a\      # Patcher: snapshot-store-listings worker auth\n      PRICE_HUB_SNAPSHOT_TOKEN: ${PRICE_HUB_SNAPSHOT_TOKEN:-}' docker-compose.yml
  grep -q 'PRICE_HUB_SNAPSHOT_TOKEN' docker-compose.yml || { echo "compose edit failed (anchor line not found)" >&2; exit 1; }
  echo "compose: env line added"
fi
sed -i 's|^  const workerTimeoutMs = 1 \* 60 \* 1000$|  const workerTimeoutMs = 150 * 1000 // Patcher: function budgets 110 s, hosted wall clock 150 s|' volumes/functions/main/index.ts
grep -q 'const workerTimeoutMs = 150 \* 1000' volumes/functions/main/index.ts || { echo "router timeout edit failed" >&2; exit 1; }
python3 - volumes/functions/main/index.ts <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
not_found = """    return new Response(JSON.stringify({ msg: 'function not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
"""
edits = [
    ("Patcher: only plain function slugs",
     "  if (!service_name || service_name === '') {",
     "  // Patcher: only plain function slugs; the router itself, _shared and dotfiles are not functions\n"
     "  if (service_name && (service_name === 'main' || !/^[a-z0-9][a-z0-9_-]*$/.test(service_name))) {\n"
     + not_found + "  }\n\n"),
    ("unknown slug -> 404",
     "  const memoryLimitMb = 150\n",
     "  // Patcher: unknown slug -> 404 instead of a 500 that echoes internal paths\n"
     "  try {\n    await Deno.stat(`${servicePath}/index.ts`)\n  } catch {\n"
     + not_found + "  }\n\n"),
]
for marker, anchor, block in edits:
    if marker in s:
        continue
    if s.count(anchor) != 1:
        sys.exit(f"router guard edit failed (anchor not found: {anchor.strip()})")
    s = s.replace(anchor, block + anchor)
open(p, "w").write(s)
PY
rm -rf volumes/functions/hello
find volumes/functions -maxdepth 1 -name '._*' -delete
EOF
COPYFILE_DISABLE=1 tar --no-xattrs -C "$REPO_ROOT/supabase/functions" -cf - snapshot-store-listings _shared \
  | ssh "$SSH_HOST" "tar -C '$PROJECT_DIR/volumes/functions' -xf -"

echo "== recreating functions container + DB setup"
remote <<'EOF'
set -euo pipefail
cd "$PROJECT_DIR"
docker compose -p <compose-project> -f "$APP_COMPOSE" up -d --no-deps functions
for i in $(seq 1 30); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' supabase-edge-functions)" = healthy ] && break; sleep 2
done
docker exec supabase-edge-functions sh -c 'test -n "$PRICE_HUB_SNAPSHOT_TOKEN"' \
  || { echo "token not in container env" >&2; exit 1; }

PGTOKEN="$(grep '^PRICE_HUB_SNAPSHOT_TOKEN=' .env | cut -d= -f2-)" \
docker exec -i -e PGTOKEN -e JOB_ACTIVE supabase-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 -1 <<'SQL'
\getenv tok PGTOKEN
\getenv job_active JOB_ACTIVE
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
select set_config('patcher.tok', :'tok', true) is not null as token_staged;
do $$
declare
  j record;
  sid uuid;
  tok text := current_setting('patcher.tok');
begin
  if coalesce(tok, '') = '' then
    raise exception 'empty PRICE_HUB_SNAPSHOT_TOKEN';
  end if;
  select id into sid from vault.secrets where name = 'price_hub_snapshot_token';
  if sid is null then
    perform vault.create_secret(tok, 'price_hub_snapshot_token',
      'Bearer for snapshot-store-listings (must equal runtime PRICE_HUB_SNAPSHOT_TOKEN)');
  else
    perform vault.update_secret(sid, tok);
  end if;
  for j in select jobid from cron.job where jobname in ('refresh-module-discovery-snapshot', 'snapshot-store-listings-every-three-days') loop
    perform cron.unschedule(j.jobid);
  end loop;
  perform cron.schedule('refresh-module-discovery-snapshot', '17 * * * *',
    'select public.refresh_module_discovery_snapshot();');
  perform cron.schedule('snapshot-store-listings-every-three-days', '0 0 */3 * *', $job$
      select net.http_post(
        url := 'http://api-gw:8000/functions/v1/snapshot-store-listings?limit=20',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret from vault.decrypted_secrets where name = 'price_hub_snapshot_token'
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      ) as request_id;
    $job$);
end $$;
select cron.alter_job(jobid, active := :'job_active'::boolean) from cron.job
 where jobname = 'snapshot-store-listings-every-three-days';
SQL

echo "== verify"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' \
  'http://127.0.0.1:8000/functions/v1/snapshot-store-listings?limit=1')
echo "no token          -> $code (expect 401)"
tok="$(grep '^PRICE_HUB_SNAPSHOT_TOKEN=' .env | cut -d= -f2-)"
body=$(curl -s -m 150 -X POST -H 'Content-Type: application/json' -H "Authorization: Bearer $tok" -d '{}' \
  -w '\nHTTP %{http_code}' 'http://127.0.0.1:8000/functions/v1/snapshot-store-listings?limit=1')
unset tok
echo "authorised limit=1 -> $(printf '%s' "$body" | tail -1)"
printf '%s\n' "$body" | sed '$d' | head -c 600; echo
q() { docker exec supabase-db psql -U supabase_admin -d postgres -AtX -v ON_ERROR_STOP=1 -c "$1"; }
# A data-only/ad-hoc restore leaves the matview unpopulated, and the job's
# REFRESH ... CONCURRENTLY then fails every hour; populate it once first.
if [ "$(q "select ispopulated from pg_matviews where schemaname='public' and matviewname='module_discovery_snapshot'")" = f ]; then
  q "refresh materialized view public.module_discovery_snapshot;" >/dev/null && echo "discovery matview  -> populated (was empty)"
fi
q "select public.refresh_module_discovery_snapshot();" >/dev/null && echo "discovery refresh  -> ok"
q "select jobname || ' | ' || schedule || ' | active=' || active from cron.job order by jobname"
q "select 'latest observed_at: ' || max(observed_at) from public.module_price_snapshots" || true
EOF
echo "done. Record the verify output in the checklist (Phase 1, hosted-only pieces)."
