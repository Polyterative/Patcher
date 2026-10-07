#!/usr/bin/env bash
#
# The "self-host is production" lock (review 3 F3). Sets / shows the cluster role
# patcher_selfhost_live on the self-host. While it exists, every script that
# replaces data wholesale refuses the target (lib/pg-common.sh
# require_staging_target): refresh-staging-from-hosted.sh (pnpm refresh:staging),
# import-auth-to-selfhost.sh, copy-migration-history.sh, capture-grants.sh apply
# (+ its SQL prelude), delta-sync.mjs --direction forward. The refresh also
# re-checks it inside its load transaction.
#
#   status   (default) read-only: marker + lock present?
#   on       create the lock (idempotent). Runbook §10: right after the final
#            import + hosted-only setup, BEFORE the Vercel flip.
#
# There is deliberately no `off`. Only after a rollback to hosted, when the
# self-host is staging again, the owner drops it by hand on the NAS:
#   docker exec -it supabase-db psql -U supabase_admin -d postgres -c 'DROP ROLE patcher_selfhost_live;'
#
# Owner-run from the repo root; works over `ssh $SSH_HOST` + docker exec (no DB URL).
# Env: SSH_HOST (.env.selfhost-ops).

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib/selfhost-env.sh"
selfhost_require SSH_HOST
MODE="${1:-status}"

db() { ssh "${SSH_HOST}" "docker exec -i supabase-db psql -U supabase_admin -d postgres -AtX -v ON_ERROR_STOP=1"; }

case "${MODE}" in
  -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  status|on) ;;
  *) echo "ERROR: usage: selfhost-live-lock.sh [status|on]" >&2; exit 1 ;;
esac

state="$(db <<'SQL'
SELECT (SELECT count(*) FROM pg_roles WHERE rolname = 'patcher_selfhost_marker') || ' '
    || (SELECT count(*) FROM pg_roles WHERE rolname = 'patcher_selfhost_live');
SQL
)"
marker="${state% *}"; live="${state#* }"
[ "${marker}" = "1" ] || { echo "ERROR: patcher_selfhost_marker missing — this is not the self-host." >&2; exit 1; }

if [ "${MODE}" = "status" ]; then
  [ "${live}" = "1" ] && echo "LIVE: self-host is production; staging-only scripts refuse it." \
    || echo "STAGING: no live lock; refresh/import scripts may replace data."
  exit 0
fi

if [ "${live}" = "1" ]; then
  echo "LIVE lock already set."
  exit 0
fi
db <<'SQL' > /dev/null
CREATE ROLE patcher_selfhost_live NOLOGIN;
COMMENT ON ROLE patcher_selfhost_live IS 'Self-host is production: staging-only refresh/import scripts refuse this cluster (scripts/ops/selfhost-live-lock.sh).';
SQL
echo "LIVE lock set. Staging-only scripts now refuse this cluster."
