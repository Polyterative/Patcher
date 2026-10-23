#!/usr/bin/env bash
# Disposable-Postgres validation for the maintenance-gate extras. Never point this at a real database.
# Docker (postgres:15) by default; otherwise PG_BIN = local PostgreSQL bin dir (throwaway cluster).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
if docker info >/dev/null 2>&1; then
  NAME="patcher-maintx-test-$$"
  trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
  docker run --rm -d --name "$NAME" -e POSTGRES_PASSWORD=postgres postgres:15 >/dev/null
  for _ in $(seq 1 60); do docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
  sleep 2
  docker cp "$ROOT" "$NAME:/work"; BASE=/work
  runf() { echo "--- ${1#$BASE/}"; docker exec "$NAME" psql -v ON_ERROR_STOP=1 -q "${@:2}" -U postgres -d postgres -f "$1"; }
else
  : "${PG_BIN:?Docker is not available: set PG_BIN to the directory containing initdb, pg_ctl and psql}"
  export LC_ALL="${PG_LOCALE:-en_US.UTF-8}"
  TMP="$(mktemp -d /tmp/pgmaintx.XXXXXX)"; BASE="$ROOT"
  trap '"$PG_BIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
  "$PG_BIN/initdb" -D "$TMP/data" -U postgres --auth=trust --locale=C --encoding=UTF8 >/dev/null
  "$PG_BIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
  runf() { echo "--- ${1#$BASE/}"; "$PG_BIN/psql" -v ON_ERROR_STOP=1 -q "${@:2}" -h "$TMP" -U postgres -d postgres -f "$1"; }
fi
MIG="$BASE/20261023130000_maintenance_gate_extras.sql"
ROLL="$BASE/rollback/20261023130000_maintenance_gate_extras.rollback.sql"

echo "=== stubs";  runf $BASE/test/00_stubs.sql
runf $BASE/test/02_snapshot.sql -v label=before
echo "=== apply (twice)"; runf $MIG; runf $MIG
echo "=== behaviour matrix"; runf $BASE/test/01_gate.sql
echo "=== rollback (twice, flag left on to prove exact restore)"
runf $BASE/test/04_flag_on.sql
runf $ROLL; runf $ROLL
runf $BASE/test/02_snapshot.sql -v label=after
runf $BASE/test/03_compare.sql
echo "=== re-apply after rollback, matrix again"; runf $MIG; runf $BASE/test/01_gate.sql; runf $ROLL
echo "ALL GREEN"
