#!/usr/bin/env bash
# Runs ON the NAS (installed as $OPS_DIR/price-hub/run.sh by price-hub-refresh-nas.sh --install).
# Called by the NAS cron job, or by `--run` / `--dry-run` from the Mac. Extra args go to scheduled-refresh.ts.
# One run at a time (container name is the lock); hard stop after HARD_TIMEOUT (SIGTERM keeps the checkpoint).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OPS_DIR="$(dirname "$HERE")"
NAME=patcher-price-hub
STATE="$HERE/state"
LOGS="$STATE/logs"
HARD_TIMEOUT="${HARD_TIMEOUT:-12h}"
[ -f "$OPS_DIR/selfhost-ops.env" ] && { set -a; . "$OPS_DIR/selfhost-ops.env"; set +a; }

if [ -n "$(docker ps -q --filter "name=^${NAME}\$")" ]; then
  echo "$NAME is already running; not starting another run." >&2
  exit 0
fi

mkdir -p "$LOGS"
chown -R 1000:1000 "$STATE"   # the image runs as the `node` user (uid 1000)
find "$LOGS" -name '*.log' -mtime +14 -delete

mode=live; case " $* " in *" --dry-run "*) mode=dry-run ;; esac
log="$LOGS/$(date -u +%Y%m%dT%H%M%SZ)-$mode.log"
topic="$(cat "$OPS_DIR/ntfy-topic" 2>/dev/null || true)"

timeout --signal=TERM --kill-after=2m "$HARD_TIMEOUT" \
  docker run --rm --name "$NAME" --memory 10g \
    --add-host=host.docker.internal:host-gateway \
    --env-file "$HERE/price-hub.env" \
    -e PRICE_HUB_STATE_DIR=/state \
    -e NTFY_SERVER="${NTFY_SERVER:-https://ntfy.sh}" \
    -e NTFY_TOPIC="$topic" \
    -v "$STATE:/state" \
    "$NAME:latest" "$@" >>"$log" 2>&1
rc=$?
echo "exit $rc" >>"$log"
exit $rc
