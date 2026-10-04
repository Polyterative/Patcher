#!/usr/bin/env bash
# Phone alerts for the self-host stack (checklist item 17). Runs ON the NAS from a
# NAS cron job every 15 min; installed by `--install` from the Mac.
#
# Runs lib/selfhost-health-remote.sh and pushes to ntfy (https://ntfy.sh/<topic>):
#   - OK -> FAIL: high-priority alert with the FAIL lines
#   - still failing: reminder every REMIND_H hours (default 4)
#   - FAIL -> OK: recovery notice
#   - daily heartbeat at HEARTBEAT_HOUR (default 09) - if it stops arriving, the NAS,
#     its internet or this cron is down.
# The topic is the only secret: kept in $OPS_DIR/ntfy-topic (0600), never in git.
# Push bodies carry only check lines (container/pool names), no keys or data.
#
# Usage (Mac, repo root):
#   bash scripts/ops/selfhost-health-notify.sh --install   # copy scripts, create topic if
#                                                          # missing, create/update cron
#   bash scripts/ops/selfhost-health-notify.sh --test      # send one test push now
# On the NAS (what the cron runs): bash $OPS_DIR/selfhost-health-notify.sh
set -uo pipefail

OPS_DIR="${OPS_DIR:-<ops-dir>}"
NTFY_SERVER="${NTFY_SERVER:-https://ntfy.sh}"
PUBLIC_URL="${PUBLIC_URL-https://supabase.patcher.xyz}"
REMIND_H="${REMIND_H:-4}"
HEARTBEAT_HOUR="${HEARTBEAT_HOUR:-09}"
CRON_DESC="Self-host Supabase health check + ntfy alerts (item 17)"

case "${1:-}" in
  --install|--test)
    SSH_HOST="${SSH_HOST:-NAS}"
    here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ "$1" = --install ]; then
      ssh "$SSH_HOST" "mkdir -p '$OPS_DIR' && chmod 700 '$OPS_DIR'"
      scp -q "$here/selfhost-health-notify.sh" "$here/lib/selfhost-health-remote.sh" "$SSH_HOST:$OPS_DIR/"
      ssh "$SSH_HOST" "set -e; cd '$OPS_DIR'; chmod 700 *.sh; \
        [ -s ntfy-topic ] || { (umask 077; echo \"patcher-selfhost-\$(openssl rand -hex 12)\" > ntfy-topic); echo 'new topic created'; }"
      ssh "$SSH_HOST" "python3 - '$OPS_DIR' '$CRON_DESC'" <<'PY'
import json, subprocess, sys
ops, desc = sys.argv[1], sys.argv[2]
job = {"user": "root", "command": "bash %s/selfhost-health-notify.sh >/dev/null 2>&1" % ops,
       "description": desc, "enabled": True, "stdout": False, "stderr": True,
       "schedule": {"minute": "*/15", "hour": "*", "dom": "*", "month": "*", "dow": "*"}}
jobs = json.loads(subprocess.check_output(["midclt", "call", "cronjob.query"]))
mine = [j for j in jobs if j["description"] == desc]
if mine:
    subprocess.check_call(["midclt", "call", "cronjob.update", str(mine[0]["id"]), json.dumps(job)], stdout=subprocess.DEVNULL)
    print("cron job %d updated" % mine[0]["id"])
else:
    r = json.loads(subprocess.check_output(["midclt", "call", "cronjob.create", json.dumps(job)]))
    print("cron job %d created" % r["id"])
PY
      echo "Installed in $SSH_HOST:$OPS_DIR. Subscribe in the ntfy app to the topic in $OPS_DIR/ntfy-topic."
    else
      ssh "$SSH_HOST" "curl -fsS -o /dev/null -H 'Title: Patcher self-host: test' -H 'Tags: white_check_mark' \
        -d 'Test push from the NAS health alerts. If you see this, alerts work.' \
        '$NTFY_SERVER/'\"\$(cat '$OPS_DIR/ntfy-topic')\" && echo 'test push sent'"
    fi
    exit $? ;;
  "") ;;
  *) echo "unknown argument: $1" >&2; exit 1 ;;
esac

# --- on the NAS ---
topic="$(cat "$OPS_DIR/ntfy-topic")" || exit 1
state_file="$OPS_DIR/health.state"   # "<ok|fail> <epoch of last push>"
heartbeat_file="$OPS_DIR/heartbeat.day"
push() { # title priority tags body
  curl -fsS -m 20 -o /dev/null -H "Title: $1" -H "Priority: $2" -H "Tags: $3" -d "$4" "$NTFY_SERVER/$topic"
}

out="$(PUBLIC_URL="$PUBLIC_URL" bash "$OPS_DIR/selfhost-health-remote.sh" 2>&1)"; rc=$?
now=$(date +%s)
state=ok; [ "$rc" -eq 0 ] || state=fail
prev=ok; last_push=0
[ -s "$state_file" ] && read -r prev last_push < "$state_file"
fails="$(printf '%s\n' "$out" | grep -E '^FAIL' || true)"
[ -n "$fails" ] || fails="$(printf '%s\n' "$out" | tail -3)"

if [ "$state" = fail ] && [ "$prev" = ok ]; then
  push "Patcher self-host: FAIL" high rotating_light "$fails" && last_push=$now
elif [ "$state" = fail ] && [ $((now - last_push)) -ge $((REMIND_H * 3600)) ]; then
  push "Patcher self-host: still failing" high warning "$fails" && last_push=$now
elif [ "$state" = ok ] && [ "$prev" = fail ]; then
  push "Patcher self-host: recovered" default white_check_mark "All checks OK again." && last_push=$now
fi

today=$(date +%F)
if [ "$(date +%H)" = "$HEARTBEAT_HOUR" ] && [ "$(cat "$heartbeat_file" 2>/dev/null)" != "$today" ]; then
  summary="$(printf '%s\n' "$out" | grep -E '^(WARN|FAIL)' || true)"
  push "Patcher self-host: daily $( [ "$state" = ok ] && echo OK || echo FAIL )" low "$( [ "$state" = ok ] && echo green_heart || echo warning )" \
    "${summary:-All checks OK. (Daily heartbeat - if this stops arriving, the NAS or its internet is down.)}" \
    && echo "$today" > "$heartbeat_file"
fi
echo "$state $last_push" > "$state_file"
exit "$rc"
