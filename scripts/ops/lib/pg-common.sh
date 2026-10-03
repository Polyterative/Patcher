#!/usr/bin/env bash
# Shared helpers for the self-host ops scripts (sourced, not executed).
#
# - pg_q: run one query; NON-ZERO EXIT ON ERROR (never turns failures into values,
#   so "both sides errored" can no longer read as a match).
# - Normalised session settings so row text hashes identically on PG15 and PG17.
# - Staging-target guard: writes require the target cluster to carry the
#   `patcher_selfhost_marker` role. Roles are cluster-level and never ride a
#   schema/data dump, so hosted Supabase can never carry it by accident.
#   One-time setup on the self-host (owner, superuser):
#     CREATE ROLE patcher_selfhost_marker NOLOGIN;

PATCHER_SELFHOST_MARKER_ROLE="patcher_selfhost_marker"

# Deterministic text output for hashing across servers/versions.
export PGOPTIONS="${PGOPTIONS:-} -c TimeZone=UTC -c DateStyle=ISO,YMD -c IntervalStyle=postgres -c extra_float_digits=1 -c statement_timeout=600000"

pg_q() {
  local url="$1" sql="$2"
  psql "${url}" -X -v ON_ERROR_STOP=1 -tAc "${sql}"
}

# Same as pg_q but prints one row per line with a field separator (for diffs).
pg_rows() {
  local url="$1" sql="$2"
  psql "${url}" -X -v ON_ERROR_STOP=1 -tA -F'|' -c "${sql}"
}

looks_hosted_url() {
  local lowered
  lowered="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  case "${lowered}" in
    *supabase.co*|*supabase.com*|*supabase.in*|*pooler.supabase*) return 0 ;;
    *) return 1 ;;
  esac
}

has_selfhost_marker() {
  local url="$1" found
  found="$(pg_q "${url}" "SELECT count(*) FROM pg_roles WHERE rolname = '${PATCHER_SELFHOST_MARKER_ROLE}';")" || return 2
  [ "${found}" = "1" ]
}

# Refuse to write unless the target proves it is the self-host cluster.
# Exit 1 with a message otherwise. Escape hatch is deliberately not provided.
require_selfhost_target() {
  local url="$1"
  if looks_hosted_url "${url}"; then
    echo "ERROR: target URL looks like hosted Supabase; refusing to write." >&2
    exit 1
  fi
  local rc=0
  has_selfhost_marker "${url}" || rc=$?
  if [ "${rc}" -eq 2 ]; then
    echo "ERROR: could not connect to the target to verify it." >&2
    exit 1
  elif [ "${rc}" -ne 0 ]; then
    echo "ERROR: target lacks the '${PATCHER_SELFHOST_MARKER_ROLE}' role, so it is not proven to be the self-host." >&2
    echo "       One-time owner setup on the self-host: CREATE ROLE ${PATCHER_SELFHOST_MARKER_ROLE} NOLOGIN;" >&2
    exit 1
  fi
}

# Source must NOT carry the marker (catches swapped SOURCE/TARGET).
require_not_selfhost_source() {
  local url="$1" rc=0
  has_selfhost_marker "${url}" || rc=$?
  if [ "${rc}" -eq 2 ]; then
    echo "ERROR: could not connect to the source." >&2
    exit 1
  elif [ "${rc}" -eq 0 ]; then
    echo "ERROR: source carries the self-host marker — SOURCE/TARGET look swapped." >&2
    exit 1
  fi
}

# Server major version (e.g. 15) and local client major version.
server_major() { pg_q "$1" "SHOW server_version_num;" | cut -c1-2; }
client_major() { "${1:-pg_dump}" --version | sed -E 's/[^0-9]*([0-9]+).*/\1/'; }

mask_db_url() {
  # Mask everything between "://" and the LAST "@" (passwords may contain "@").
  printf '%s' "$1" | sed -E 's#(://)(.*)@#\1***@#'
}
