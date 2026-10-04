#!/usr/bin/env bash
# Runs ON the NAS: the checks behind scripts/ops/selfhost-health.sh (piped over ssh)
# and the 15-minute alert cron (selfhost-health-notify.sh). Read-only.
# Env: GATEWAY (http://127.0.0.1:8000), DUMP_DIR (<dump-dir>),
#      PUBLIC_URL (optional, e.g. https://supabase.patcher.xyz).
GATEWAY="${GATEWAY:-http://127.0.0.1:8000}"
DUMP_DIR="${DUMP_DIR:-<dump-dir>}"
set -uo pipefail
fails=0
ok()   { printf 'OK    %s\n' "$1"; }
warn() { printf 'WARN  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; fails=$((fails + 1)); }
now=$(date +%s)
age_h() { echo $(( (now - $1) / 3600 )); }

echo "== containers"
expected="supabase-db supabase-auth supabase-rest supabase-storage supabase-envoy supabase-meta supabase-pooler supabase-imgproxy supabase-edge-functions supabase-studio realtime-dev.supabase-realtime"
for c in $expected; do
  st=$(docker inspect -f '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}|{{.RestartCount}}|{{.State.StartedAt}}' "$c" 2>/dev/null) \
    || { fail "$c missing"; continue; }
  IFS='|' read -r status health restarts started <<<"$st"
  if [ "$status" = running ] && [ "$health" = healthy ]; then
    if [ "$restarts" -gt 0 ]; then warn "$c healthy but restarted $restarts× (since ${started%%.*})"; else ok "$c healthy"; fi
  else
    fail "$c status=$status health=$health restarts=$restarts"
  fi
done
tunnel=$(docker ps --filter name=cloudflared --format '{{.Names}} {{.Status}}' | head -1)
case "$tunnel" in
  *" Up "*) ok "tunnel ${tunnel%% *} up" ;;
  "") fail "tunnel container not running" ;;
  *) fail "tunnel $tunnel" ;;
esac

echo "== storage"
pools=$(zpool status -x 2>&1)
[ "$pools" = "all pools are healthy" ] && ok "zpools healthy" || fail "zpool: $pools"
avail=$(zfs list -Hp -o avail <zfs-dataset>)
[ "$avail" -gt $((50 * 1024 * 1024 * 1024)) ] && ok "<zfs-dataset> free $((avail / 1024 / 1024 / 1024)) GiB" \
  || fail "<zfs-dataset> free only $((avail / 1024 / 1024 / 1024)) GiB"
if command -v smartctl >/dev/null; then
  for d in $(lsblk -dno NAME,TYPE | awk '$2=="disk" && $1 !~ /^zd/ {print $1}'); do
    r=$(smartctl -H "/dev/$d" 2>/dev/null | grep -E 'overall-health|SMART Health Status' | awk -F: '{gsub(/^ +/,"",$2); print $2}')
    case "$r" in
      PASSED|OK) ok "SMART $d $r" ;;
      "") warn "SMART $d unreadable (permissions or no SMART)" ;;
      *) fail "SMART $d $r" ;;
    esac
  done
else
  warn "smartctl not found"
fi

echo "== backups"
snap=$(zfs list -Hp -t snapshot -o creation -s creation <zfs-dataset> 2>/dev/null | tail -1)
if [ -n "$snap" ]; then
  [ $((now - snap)) -lt 7200 ] && ok "newest <zfs-dataset> snapshot $(age_h "$snap") h old" \
    || fail "newest <zfs-dataset> snapshot $(age_h "$snap") h old (hourly task 13)"
else
  fail "no <zfs-dataset> snapshots"
fi
rep=$(zfs list -Hp -t snapshot -o creation -s creation <replica-dataset> 2>/dev/null | tail -1)
if [ -n "$rep" ]; then
  [ $((now - rep)) -lt 93600 ] && ok "newest replica snapshot $(age_h "$rep") h old" \
    || fail "newest replica snapshot $(age_h "$rep") h old (replication 4, daily 03:30)"
else
  fail "no <replica-dataset> snapshots"
fi
dump=$(ls -t "$DUMP_DIR"/postgres-*.dump 2>/dev/null | head -1)
if [ -n "$dump" ]; then
  mt=$(stat -c %Y "$dump"); sz=$(stat -c %s "$dump")
  if [ $((now - mt)) -ge 93600 ]; then fail "newest dump $(age_h "$mt") h old (cron 16, 02:30)"
  elif [ "$sz" -lt 1000000 ]; then fail "newest dump only $sz bytes"
  else ok "newest dump $(basename "$dump") $((sz / 1024)) KiB, $(age_h "$mt") h old"; fi
else
  fail "no dumps in $DUMP_DIR"
fi

echo "== database"
q() { docker exec supabase-db psql -U supabase_admin -d postgres -AtX -c "$1" 2>&1; }
cf=$(q "select count(*) from cron.job_run_details where start_time > now() - interval '24 hours' and status <> 'succeeded'")
cs=$(q "select count(*) from cron.job_run_details where start_time > now() - interval '24 hours' and status = 'succeeded'")
if [ "$cf" = 0 ]; then ok "pg_cron 24 h: $cs succeeded, 0 failed"
else fail "pg_cron 24 h: $cf not succeeded ($cs succeeded)"; fi
mv=$(q "select ispopulated from pg_matviews where schemaname='public' and matviewname='module_discovery_snapshot'")
[ "$mv" = t ] && ok "module_discovery_snapshot populated" || fail "module_discovery_snapshot populated=$mv"

echo "== gateway (LAN, no key: 401 = routed to auth)"
code=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$GATEWAY/auth/v1/health" || true)
case "$code" in
  200|401) ok "gateway auth/v1/health -> $code" ;;
  *) fail "gateway auth/v1/health -> ${code:-no answer}" ;;
esac
pub="${GATEWAY%:*}:8001"
code=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$pub/" || true)
[ "$code" = 404 ] && ok "public listener :8001 / -> 404 (no Studio)" || fail "public listener :8001 / -> ${code:-no answer} (want 404; re-run selfhost-public-listener.sh)"

if [ -n "${PUBLIC_URL:-}" ]; then
  echo "== public URL (through Cloudflare + tunnel, no key: 401 = routed to auth)"
  code=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$PUBLIC_URL/auth/v1/health" || true)
  [ "$code" = 401 ] || [ "$code" = 200 ] && ok "public $PUBLIC_URL/auth/v1/health -> $code" \
    || fail "public $PUBLIC_URL/auth/v1/health -> ${code:-no answer}"
fi

echo
if [ "$fails" -eq 0 ]; then echo "RESULT: all checks OK"; else echo "RESULT: $fails FAIL"; fi
exit $(( fails > 0 ))
