#!/usr/bin/env bash
# Scheduled Price Hub full refresh on the self-host NAS. Runs from the Mac (repo root) over ssh.
# Plan: internaldocs/workflow/plans/price-hub-scheduled-refresh.md
#
# NAS layout ($OPS_DIR/price-hub):
#   build/          image build context (synced by --install)
#   run.sh          NAS-side runner (what the cron job calls): single-run guard, log pruning, docker run
#   price-hub.env   OWNER-CREATED, mode 0600, docker env-file format (KEY=value, no quotes):
#                     SUPABASE_URL=http://host.docker.internal:8000   (self-host gateway via the docker host)
#                     SUPABASE_SERVICE_ROLE_KEY=...
#                   optional tuning: PRICE_HUB_STORE_TIMEOUT_MIN, PRICE_HUB_RUN_DEADLINE_H,
#                   PRICE_HUB_PROGRESS_MIN, PRICE_HUB_STORE_RETRIES, PRICE_HUB_RETRY_DELAY_MIN
#   state/          checkpoint, last-run.json, crawl output, logs/ (14-day retention)
# ntfy pushes reuse the health-alert topic in $OPS_DIR/ntfy-topic.
#
# Usage:
#   bash scripts/ops/price-hub-refresh-nas.sh --install              # sync sources, build image, install runner
#   bash scripts/ops/price-hub-refresh-nas.sh --dry-run [flags]      # start a dry run now (background on the NAS)
#   bash scripts/ops/price-hub-refresh-nas.sh --run [flags]          # start a LIVE run now (writes to SUPABASE_URL)
#   bash scripts/ops/price-hub-refresh-nas.sh --status               # running?, checkpoint, last run reports
#   bash scripts/ops/price-hub-refresh-nas.sh --logs [-f]            # newest log (tail, or follow)
#   bash scripts/ops/price-hub-refresh-nas.sh --stop                 # SIGTERM the running container (checkpoint kept)
#   bash scripts/ops/price-hub-refresh-nas.sh --enable-cron          # OWNER-GATED: every 3 days at 03:00 UTC
#   bash scripts/ops/price-hub-refresh-nas.sh --disable-cron
# [flags] are passed to scheduled-refresh.ts, e.g. --store=signal-sounds.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/selfhost-env.sh"
selfhost_require SSH_HOST OPS_DIR
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
D="$OPS_DIR/price-hub"
NAME=patcher-price-hub
CRON_DESC="Price Hub full refresh (price-hub-scheduled-refresh plan)"

remote() { ssh "$SSH_HOST" "$@"; }
quote_args() { local out="" a; for a in "$@"; do out+=" $(printf '%q' "$a")"; done; echo "$out"; }

install() {
  local ctx
  ctx="$(mktemp -d)"; trap 'rm -rf "$ctx"' RETURN
  mkdir -p "$ctx/scripts" "$ctx/supabase/functions/_shared"
  cp "$REPO/scripts/price-hub/docker/Dockerfile" "$REPO/scripts/price-hub/docker/package.json" "$ctx/"
  rsync -a --exclude docker "$REPO/scripts/price-hub" "$ctx/scripts/"
  rsync -a "$REPO/supabase/functions/_shared/price-hub" "$ctx/supabase/functions/_shared/"
  remote "mkdir -p '$D/build' '$D/state/logs' && chmod 700 '$D'"
  rsync -a --delete "$ctx/" "$SSH_HOST:$D/build/"
  scp -q "$REPO/scripts/ops/lib/price-hub-refresh-run.sh" "$SSH_HOST:$D/run.sh"
  remote "chmod 700 '$D/run.sh' && docker build -q -t $NAME:latest '$D/build' && docker image prune -f --filter label=org.patcher.component=price-hub >/dev/null"
  if remote "[ -f '$D/price-hub.env' ]"; then
    remote "chmod 600 '$D/price-hub.env'"
    echo "Installed. Env file present."
  else
    echo "Installed. MISSING $D/price-hub.env: create it on the NAS (mode 0600) with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running."
  fi
}

start() {
  remote "[ -f '$D/price-hub.env' ]" || { echo "ERROR: $D/price-hub.env missing on the NAS." >&2; exit 1; }
  remote "nohup bash '$D/run.sh'$(quote_args "$@") >/dev/null 2>&1 &"
  echo "Started on the NAS. Follow with: bash scripts/ops/price-hub-refresh-nas.sh --logs -f"
}

cron() {
  local enabled="$1"
  remote "python3 - '$D' '$CRON_DESC' '$enabled'" <<'PY'
import json, subprocess, sys
d, desc, enabled = sys.argv[1], sys.argv[2], sys.argv[3] == "true"
job = {"user": "root", "command": "bash %s/run.sh >/dev/null 2>&1" % d,
       "description": desc, "enabled": enabled, "stdout": False, "stderr": True,
       "schedule": {"minute": "0", "hour": "3", "dom": "*/3", "month": "*", "dow": "*"}}
jobs = json.loads(subprocess.check_output(["midclt", "call", "cronjob.query"]))
mine = [j for j in jobs if j["description"] == desc]
if mine:
    subprocess.check_call(["midclt", "call", "cronjob.update", str(mine[0]["id"]), json.dumps(job)], stdout=subprocess.DEVNULL)
    print("cron job %d %s" % (mine[0]["id"], "enabled" if enabled else "disabled"))
elif enabled:
    r = json.loads(subprocess.check_output(["midclt", "call", "cronjob.create", json.dumps(job)]))
    print("cron job %d created" % r["id"])
else:
    print("no cron job to disable")
PY
}

cmd="${1:-}"; shift || true
case "$cmd" in
  --install) install ;;
  --dry-run) start --dry-run "$@" ;;
  --run) start "$@" ;;
  --status)
    remote "cd '$D/state' 2>/dev/null || { echo 'not installed'; exit 0; }
      docker ps --filter name=^$NAME\$ --format 'RUNNING {{.Names}} {{.Status}}' | grep . || echo 'not running'
      for f in current-run.json last-run.json last-dry-run.json; do
        [ -f \"\$f\" ] || continue; echo \"== \$f\"
        python3 -c 'import json,sys; d=json.load(open(sys.argv[1]))
if \"done\" in d:
    s=list(d[\"done\"].values()); print(d[\"runId\"], \"dry-run\" if d[\"dryRun\"] else \"live\", len(s), \"stores done,\", sum(x[\"status\"]==\"failed\" for x in s), \"failed\")
else:
    print(json.dumps({k:v for k,v in d.items()}, indent=1))' \"\$f\"
      done" ;;
  --logs)
    if [ "${1:-}" = -f ]; then remote -t "tail -n 50 -f \"\$(ls -t '$D/state/logs/'*.log | head -1)\""
    else remote "tail -n 80 \"\$(ls -t '$D/state/logs/'*.log | head -1)\""; fi ;;
  --stop) remote "docker kill --signal TERM $NAME" ;;
  --enable-cron) cron true && remote "touch '$D/cron-enabled'" ;;   # marker arms the health-cron dead-man check
  --disable-cron) cron false && remote "rm -f '$D/cron-enabled'" ;;
  *) sed -n '2,27p' "$0"; exit 1 ;;
esac
