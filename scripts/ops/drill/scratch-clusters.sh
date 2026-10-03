#!/usr/bin/env bash
#
# Two throwaway local Postgres clusters for self-host tooling drills:
#   A = "hosted-like"  (no marker role)            port ${DRILL_PORT_A:-55432}
#   B = "self-host"    (carries the marker role)   port ${DRILL_PORT_B:-55433}
# Both get Supabase platform stubs (bootstrap-stubs.sql) + a hosted `public`
# schema dump, optionally a data dump. Everything lives under DRILL_DIR and is
# local-only (TCP on 127.0.0.1, trust auth, no network exposure).
#
# Cross-major drills: point PG_BIN_A / PG_BIN_B at different installs, e.g.
#   PG_BIN_A=/opt/homebrew/opt/postgresql@15/bin PG_BIN_B=/opt/homebrew/opt/postgresql@17/bin
#
# Usage:
#   bash scripts/ops/drill/scratch-clusters.sh up <schema-dump.sql> [data-dump.sql]
#   bash scripts/ops/drill/scratch-clusters.sh urls     # prints export lines
#   bash scripts/ops/drill/scratch-clusters.sh down
#
# A data dump of real hosted data contains user data: it stays on this machine
# (DRILL_DIR), and `down` deletes the clusters.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRILL_DIR="${DRILL_DIR:-${TMPDIR:-/tmp}/patcher-drill}"
PORT_A="${DRILL_PORT_A:-55432}"
PORT_B="${DRILL_PORT_B:-55433}"
DEFAULT_BIN="$(pg_config --bindir 2>/dev/null || dirname "$(command -v psql)")"
BIN_A="${PG_BIN_A:-${DEFAULT_BIN}}"
BIN_B="${PG_BIN_B:-${DEFAULT_BIN}}"
# initdb/postmaster refuse a missing or "C"-less locale on macOS shells.
export LC_ALL="${DRILL_LOCALE:-en_US.UTF-8}" LANG="${DRILL_LOCALE:-en_US.UTF-8}"

url() { echo "postgresql://postgres@127.0.0.1:$1/postgres"; }

start_cluster() {
  local name="$1" port="$2" bin="$3"
  "${bin}/initdb" -D "${DRILL_DIR}/${name}" -U postgres -A trust --locale="${LC_ALL}" >/dev/null
  # -k '': no unix socket (long temp paths exceed the 103-byte socket limit).
  "${bin}/pg_ctl" -D "${DRILL_DIR}/${name}" -o "-p ${port} -k '' -h 127.0.0.1" \
    -l "${DRILL_DIR}/${name}.log" -w start >/dev/null
}

load() {
  local port="$1" file="$2"
  psql "$(url "${port}")" -X -q -v ON_ERROR_STOP=1 -f "${file}" >/dev/null
}

case "${1:-}" in
  up)
    schema="${2:-}"; data="${3:-}"
    [ -f "${schema}" ] || { echo "ERROR: up needs a schema dump file." >&2; exit 1; }
    [ -z "${data}" ] || [ -f "${data}" ] || { echo "ERROR: data dump not found." >&2; exit 1; }
    [ ! -e "${DRILL_DIR}" ] || { echo "ERROR: ${DRILL_DIR} exists; run 'down' first." >&2; exit 1; }
    mkdir -p "${DRILL_DIR}"; chmod 700 "${DRILL_DIR}"
    start_cluster a "${PORT_A}" "${BIN_A}"
    start_cluster b "${PORT_B}" "${BIN_B}"
    for port in "${PORT_A}" "${PORT_B}"; do
      load "${port}" "${SCRIPT_DIR}/bootstrap-stubs.sql"
      load "${port}" "${schema}"
      # Schema-only dumps carry no grants: give the API roles the hosted default posture.
      load "${port}" "${SCRIPT_DIR}/../staging-public-grants.sql"
      [ -z "${data}" ] || load "${port}" "${data}"
    done
    psql "$(url "${PORT_B}")" -X -q -c "CREATE ROLE patcher_selfhost_marker NOLOGIN;"
    echo "A (hosted-like): PG $(psql "$(url "${PORT_A}")" -tAXc 'SHOW server_version;')  B (self-host, marker): PG $(psql "$(url "${PORT_B}")" -tAXc 'SHOW server_version;')"
    bash "$0" urls
    ;;
  urls)
    echo "export DRILL_HOSTED_URL=$(url "${PORT_A}") DRILL_SELFHOST_URL=$(url "${PORT_B}")"
    ;;
  down)
    for name in a b; do
      [ -d "${DRILL_DIR}/${name}" ] && "${BIN_A}/pg_ctl" -D "${DRILL_DIR}/${name}" -m fast stop >/dev/null 2>&1 || true
    done
    rm -rf "${DRILL_DIR}"
    echo "drill clusters removed"
    ;;
  *)
    sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
