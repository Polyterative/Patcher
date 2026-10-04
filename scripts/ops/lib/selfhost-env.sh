#!/usr/bin/env bash
# NAS-specific values for the self-host ops scripts (sourced, not executed).
# They describe the owner's home server, so they live in the gitignored
# `.env.selfhost-ops` at the repo root (on the NAS: `selfhost-ops.env` next to the
# installed scripts), never in git. Shell env wins over the file.
#
#   SSH_HOST           ssh alias of the NAS
#   SELFHOST_LAN_HOST  LAN address of the NAS (gateway :8000, pooler :5432)
#   PROJECT_DIR        supabase-project directory on the NAS
#   APP_COMPOSE        rendered compose file of the NAS app
#   COMPOSE_PROJECT    docker compose project name of the NAS app
#   ZFS_DATASET        dataset holding the stack (snapshots)
#   REPLICA_DATASET    replication target dataset
#   DUMP_DIR           nightly pg_dump directory on the NAS
#   OPS_DIR            ops directory on the NAS (health alerts)
#
# Usage: source this file, then `selfhost_require VAR...` (exits with a hint if unset).

_selfhost_env_load() {
  local f
  for f in "$@"; do
    [ -f "$f" ] || continue
    local line key
    while IFS= read -r line || [ -n "$line" ]; do
      case "$line" in ''|'#'*) continue ;; esac
      key="${line%%=*}"
      [ -z "${!key:-}" ] && export "$key=${line#*=}"
    done < "$f"
  done
}
_selfhost_env_load "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." 2>/dev/null && pwd)/.env.selfhost-ops" \
  "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/selfhost-ops.env"

selfhost_require() {
  local v missing=()
  for v in "$@"; do [ -n "${!v:-}" ] || missing+=("$v"); done
  [ "${#missing[@]}" -eq 0 ] && return 0
  echo "ERROR: missing ${missing[*]} — set them in the gitignored .env.selfhost-ops (see scripts/ops/lib/selfhost-env.sh)." >&2
  exit 1
}
