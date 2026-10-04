#!/usr/bin/env bash
# Run a command with TARGET_DB_URL pointing at the self-host staging database as
# supabase_admin (superuser), through the Supavisor pooler on the LAN (session
# mode, port 5432). The NAS has AllowTcpForwarding=no, so the runbook's
# `ssh -L` tunnel does not work.
#
# The password and tenant id are read from the server .env over `ssh NAS`
# at run time; the URL is exported only to the child command, never printed.
#
# Usage:
#   bash scripts/ops/with-staging-db.sh <command> [args...]
#   e.g. bash scripts/ops/with-staging-db.sh bash scripts/ops/import-auth-to-selfhost.sh
#
# Env: SSH_HOST (default NAS), STAGING_HOST (default <nas-lan-ip>),
#      PROJECT_DIR (default <project-dir>).

set -euo pipefail

SSH_HOST="${SSH_HOST:-NAS}"
STAGING_HOST="${STAGING_HOST:-<nas-lan-ip>}"
PROJECT_DIR="${PROJECT_DIR:-<project-dir>}"

[ $# -gt 0 ] || { sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 1; }

env_value() { ssh "${SSH_HOST}" "grep '^$1=' '${PROJECT_DIR}/.env' | cut -d= -f2-"; }

pw="$(env_value POSTGRES_PASSWORD)"
tenant="$(env_value POOLER_TENANT_ID)"
[ -n "${pw}" ] && [ -n "${tenant}" ] || { echo "ERROR: could not read POSTGRES_PASSWORD / POOLER_TENANT_ID from the server .env" >&2; exit 1; }

TARGET_DB_URL="postgresql://supabase_admin.${tenant}:$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "${pw}")@${STAGING_HOST}:5432/postgres"
export TARGET_DB_URL
unset pw

exec "$@"
