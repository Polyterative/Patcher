#!/usr/bin/env bash
# Read-only health report for the self-host Supabase stack on the NAS (checklist
# item 17). Owner- or agent-run from the repo root on the Mac; everything happens
# over `ssh $SSH_HOST`. Writes nothing, uses no API keys, never contacts hosted.
#
# Checks: container health + restart counts, ZFS pool health + free space, SMART,
# newest hourly snapshot, newest replica snapshot, newest nightly pg_dump,
# pg_cron failures in the last 24 h, gateway reachability on the LAN, public URL,
# Grafana container + :3001 (only once the `grafana` container exists).
# The checks live in lib/selfhost-health-remote.sh (also run by the NAS alert cron).
#
# Exit code: 0 all OK, 1 any FAIL (WARN does not fail) — usable from a cron or
# an uptime monitor later.
#
# Env: SSH_HOST, DUMP_DIR, ZFS_DATASET, REPLICA_DATASET (from .env.selfhost-ops),
#      GATEWAY (default http://127.0.0.1:8000, as seen from the NAS),
#      PUBLIC_URL (default https://supabase.patcher.xyz; empty skips it).

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib/selfhost-env.sh"
selfhost_require SSH_HOST DUMP_DIR ZFS_DATASET REPLICA_DATASET
GATEWAY="${GATEWAY:-http://127.0.0.1:8000}"
PUBLIC_URL="${PUBLIC_URL-https://supabase.patcher.xyz}"

case "${1:-}" in
  -h|--help) sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  "") ;;
  *) echo "unknown argument: $1" >&2; exit 1 ;;
esac

ssh "$SSH_HOST" "GATEWAY='$GATEWAY' DUMP_DIR='$DUMP_DIR' ZFS_DATASET='$ZFS_DATASET' REPLICA_DATASET='$REPLICA_DATASET' PUBLIC_URL='$PUBLIC_URL' bash -s" \
  < "$(dirname "${BASH_SOURCE[0]}")/lib/selfhost-health-remote.sh"
