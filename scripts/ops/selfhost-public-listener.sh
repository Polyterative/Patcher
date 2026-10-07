#!/usr/bin/env bash
# H5: give the public tunnel an API-only gateway port so Studio stays LAN-only.
#
# Generates a second Envoy listener (default :8001) from the upstream LAN listener
# (:8000) via lib/envoy-public-listener.py: only /(rest|auth|storage|functions|realtime)/v1/
# routes, everything else 404. Tests it in a throwaway gateway container on spare
# ports first, then (with --apply) snapshots, installs it, publishes the port and
# recreates only the gateway. Re-run after every upstream upgrade of the envoy template.
#
# Usage: bash scripts/ops/selfhost-public-listener.sh [--apply]
# Env: SSH_HOST, ZFS_DATASET, PROJECT_DIR, APP_COMPOSE, COMPOSE_PROJECT (.env.selfhost-ops), PUBLIC_PORT (8001)
# The Cloudflare tunnel's service URL must point at http://<server>:PUBLIC_PORT (owner step).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "$(dirname "${BASH_SOURCE[0]}")/lib/selfhost-env.sh"
selfhost_require SSH_HOST ZFS_DATASET PROJECT_DIR APP_COMPOSE COMPOSE_PROJECT
PUBLIC_PORT="${PUBLIC_PORT:-8001}"
PROJECT="${PROJECT_DIR}"
RENDERED="${APP_COMPOSE}"
APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

ANON_KEY="$(grep -E '^SUPABASE_ANON_KEY=' "${REPO_ROOT}/.env" | cut -d= -f2- | tr -d '"')"
[ -n "${ANON_KEY}" ] || { echo "SUPABASE_ANON_KEY missing in .env" >&2; exit 1; }
HOST_IP="$(ssh -G "${SSH_HOST}" | awk '/^hostname /{print $2}')"

fail=0
code() { curl -s -o /dev/null -w '%{http_code}' --path-as-is "$@"; }
expect() { # label expected actual
  if [ "$2" = "$3" ]; then printf 'OK    %-46s %s\n' "$1" "$3"; else printf 'FAIL  %-46s %s (want %s)\n' "$1" "$3" "$2"; fail=1; fi
}
probe() { # lan_port public_port
  local L="http://${HOST_IP}:$1" P="http://${HOST_IP}:$2" A=(-H "apikey: ${ANON_KEY}" -H "Authorization: Bearer ${ANON_KEY}")
  expect "public /                    (Studio)" 404 "$(code "$P/")"
  expect "public /project/default     (Studio)" 404 "$(code "$P/project/default")"
  expect "public /pg/                 (pg-meta)" 404 "$(code "$P/pg/tables")"
  expect "public /mcp, /api/mcp" "404 404" "$(code "$P/mcp") $(code "$P/api/mcp")"
  expect "public /graphql/v1" 404 "$(code "$P/graphql/v1")"
  expect "public traversal /rest/v1/../../project/default" 404 "$(code "$P/rest/v1/../../project/default")"
  expect "public auth health (anon)" 200 "$(code "${A[@]}" "$P/auth/v1/health")"
  expect "public rest modules (anon)" 200 "$(code "${A[@]}" "$P/rest/v1/modules?select=id&limit=1")"
  expect "public storage bucket list (anon)" 200 "$(code "${A[@]}" "$P/storage/v1/bucket")"
  expect "public rest without key" 401 "$(code "$P/rest/v1/modules?select=id&limit=1")"
  expect "LAN / still Studio (basic auth)" 401 "$(code "$L/")"
  expect "LAN rest modules (anon)" 200 "$(code "${A[@]}" "$L/rest/v1/modules?select=id&limit=1")"
}

echo "== generate (server, read-only)"
ssh "${SSH_HOST}" "python3 - ${PROJECT}/volumes/api/envoy/lds.template.yaml /tmp/lds.h5.yaml ${PUBLIC_PORT}" \
  < "${SCRIPT_DIR}/lib/envoy-public-listener.py"

echo "== test in a throwaway gateway (:18000 LAN copy, :18001 public)"
ssh "${SSH_HOST}" "cd ${PROJECT} && docker rm -f h5-envoy-test >/dev/null 2>&1; \
  docker compose -p ${COMPOSE_PROJECT} -f ${RENDERED} run -d --rm --no-deps --name h5-envoy-test \
  -p 18000:8000 -p 18001:${PUBLIC_PORT} -v /tmp/lds.h5.yaml:/etc/envoy/lds.template.yaml:ro api-gw >/dev/null"
trap 'ssh "${SSH_HOST}" "docker rm -f h5-envoy-test >/dev/null 2>&1" || true' EXIT
for _ in $(seq 1 30); do
  [ "$(code "http://${HOST_IP}:18001/")" = 404 ] && break; sleep 1
done
probe 18000 18001
errs="$(ssh "${SSH_HOST}" "docker logs h5-envoy-test 2>&1 | grep -ciE 'error|rejected|exception'" || true)"
expect "throwaway gateway log errors" 0 "${errs:-0}"
ssh "${SSH_HOST}" "docker rm -f h5-envoy-test >/dev/null 2>&1" || true
trap - EXIT
[ "${fail}" = 0 ] || { echo "Throwaway test failed; nothing changed on the live gateway."; exit 1; }

if [ "${APPLY}" != 1 ]; then
  echo "Dry run OK. Re-run with --apply to install on the live gateway."
  exit 0
fi

echo "== apply"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
ssh "${SSH_HOST}" "midclt call zfs.snapshot.create '{\"dataset\":\"${ZFS_DATASET}\",\"name\":\"pre-h5-${stamp}\"}' >/dev/null && echo snapshot ${ZFS_DATASET}@pre-h5-${stamp}"
ssh "${SSH_HOST}" "set -e; cd ${PROJECT}; \
  cp -p volumes/api/envoy/lds.template.yaml volumes/api/envoy/lds.template.yaml.bak-${stamp}-h5; \
  cp -p docker-compose.yml docker-compose.yml.bak-${stamp}-h5; \
  cp /tmp/lds.h5.yaml volumes/api/envoy/lds.template.yaml; rm -f /tmp/lds.h5.yaml; \
  if ! grep -q 'API_GW_PUBLIC_PORT' docker-compose.yml; then \
    sed -i 's|^      - \${API_GW_HTTP_PORT:-\${KONG_HTTP_PORT:-8000}}:8000/tcp$|&\n      - \${API_GW_PUBLIC_PORT:-${PUBLIC_PORT}}:${PUBLIC_PORT}/tcp  # H5 API-only listener for the tunnel|' docker-compose.yml; \
  fi; \
  grep -q 'API_GW_PUBLIC_PORT' docker-compose.yml || { echo 'port mapping not added' >&2; exit 1; }; \
  docker compose -p ${COMPOSE_PROJECT} -f ${RENDERED} up -d --no-deps --force-recreate api-gw 2>&1 | tail -2"
for _ in $(seq 1 30); do
  [ "$(code "http://${HOST_IP}:${PUBLIC_PORT}/")" = 404 ] && break; sleep 1
done
probe 8000 "${PUBLIC_PORT}"
if [ "${fail}" = 0 ]; then
  echo "Live gateway OK. Owner: point the Cloudflare tunnel route at http://${HOST_IP}:${PUBLIC_PORT}."
else
  echo "Live probes FAILED. Roll back: restore *.bak-${stamp}-h5 in ${PROJECT} and recreate api-gw."
  exit 1
fi
