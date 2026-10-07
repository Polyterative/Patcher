#!/usr/bin/env bash
# Grafana (Phase 1) on the NAS, next to the self-host Supabase stack. LAN-only :3001,
# no tunnel, not routed through Envoy. Runs from the repo root on the Mac; everything
# happens over `ssh $SSH_HOST`. Config + data live in $OPS_DIR/grafana (inside the
# snapshotted/replicated supabase dataset).
#
# Usage: bash scripts/ops/selfhost-grafana.sh <command>
#   deploy         create/refresh the dir, secrets (generated ON the NAS, root-only dir),
#                  pull the pinned image, sync compose + provisioning + dashboards, then
#                  write .env (root URL + Supabase network), then create the NAS
#                  custom app `grafana` (first time) or restart it
#   role [--yes]   create/refresh the read-only DB role grafana_ro from grafana/grafana-ro-role.sql
#                  (DB change, self-host only: needs owner approval; types GRAFANA ROLE unless --yes)
#   status         container health, /api/health, role login test, dashboard count
#   password       copy the Grafana admin password to the Mac clipboard (never printed)
#   rollback       stop + delete the custom app, DROP ROLE grafana_ro (types GRAFANA ROLLBACK);
#                  keeps $OPS_DIR/grafana (data + secrets) — remove by hand if wanted
# Env: SSH_HOST, OPS_DIR (.env.selfhost-ops); GRAFANA_URL for status (default http://<NAS>:3001).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$HERE/grafana"
source "$HERE/lib/selfhost-env.sh"
selfhost_require SSH_HOST OPS_DIR
GDIR="$OPS_DIR/grafana"
APP=grafana
NAS_HOST="$(ssh -G "$SSH_HOST" | awk '/^hostname /{print $2}')"
GRAFANA_URL="${GRAFANA_URL:-http://$NAS_HOST:3001}"

cmd="${1:-}"; shift || true
confirm() { # phrase
  [ "${YES:-0}" = 1 ] && return 0
  [ -t 0 ] || { echo "ERROR: needs a terminal to type $1 (or pass --yes after approval)" >&2; exit 1; }
  read -r -p "Type $1 to continue: " a; [ "$a" = "$1" ] || { echo "aborted"; exit 1; }
}
for a in "$@"; do [ "$a" = "--yes" ] && YES=1; done

app_exists() { ssh "$SSH_HOST" "midclt call app.query '[[\"name\",\"=\",\"$APP\"]]'" | python3 -c 'import sys,json; sys.exit(0 if json.load(sys.stdin) else 1)'; }

case "$cmd" in
  deploy)
    IMAGE="$(awk '/image:/{print $2; exit}' "$SRC/docker-compose.yml")"
    echo "== prepare $GDIR (image $IMAGE)"
    ssh "$SSH_HOST" "set -e; mkdir -p '$GDIR/data' '$GDIR/secrets'; chmod 700 '$GDIR/secrets'; chown 472:472 '$GDIR/data'
      for f in grafana_admin_password grafana_ro_password; do
        [ -s '$GDIR/secrets/'\$f ] || { (umask 077; openssl rand -base64 33 | tr -d '=+/\n' | cut -c1-32 > '$GDIR/secrets/'\$f); echo \"generated \$f\"; }
        chown 472:472 '$GDIR/secrets/'\$f; chmod 400 '$GDIR/secrets/'\$f
      done
      docker pull -q '$IMAGE' >/dev/null"
    echo "== sync compose + provisioning + dashboards"
    COPYFILE_DISABLE=1 tar -C "$SRC" --no-xattrs --exclude="._*" -cf - docker-compose.yml provisioning dashboards \
      | ssh "$SSH_HOST" "tar -xf - -C '$GDIR' --no-same-owner && chmod -R a+rX '$GDIR/provisioning' '$GDIR/dashboards' '$GDIR/docker-compose.yml'"
    echo "== write $GDIR/.env (compose interpolation; host-specific values stay off the repo)"
    ssh "$SSH_HOST" "set -e; NET=\$(docker inspect -f '{{range \$k, \$v := .NetworkSettings.Networks}}{{\$k}} {{end}}' supabase-db | awk '{print \$1}')
      [ -n \"\$NET\" ] || { echo 'ERROR: could not detect the supabase-db network' >&2; exit 1; }
      printf 'GRAFANA_ROOT_URL=%s\nSUPABASE_NETWORK=%s\n' '$GRAFANA_URL' \"\$NET\" > '$GDIR/.env'"
    if app_exists; then
      echo "== app exists: restarting container"
      ssh "$SSH_HOST" "docker restart $APP >/dev/null"
    else
      echo "== creating NAS custom app $APP"
      ssh "$SSH_HOST" "python3 - '$GDIR/docker-compose.yml'" <<'PY'
import json, subprocess, sys
yaml = """include:
  - path: %s
services: {}
x-portals:
  - host: 0.0.0.0
    name: Grafana
    path: /
    port: 3001
""" % sys.argv[1]
subprocess.check_call(["midclt", "call", "-j", "app.create", json.dumps(
    {"app_name": "grafana", "custom_app": True, "custom_compose_config_string": yaml})], stdout=subprocess.DEVNULL)
print("app created")
PY
    fi
    echo "Deployed. Role (owner-approved DB change): bash scripts/ops/selfhost-grafana.sh role"
    echo "Admin password to clipboard: bash scripts/ops/selfhost-grafana.sh password   (then open $GRAFANA_URL)"
    ;;
  role)
    confirm "GRAFANA ROLE"
    scp -q "$SRC/grafana-ro-role.sql" "$SSH_HOST:$GDIR/secrets/grafana-ro-role.sql"
    ssh "$SSH_HOST" "set -e; cd '$GDIR/secrets'
      { printf '\\\\set pw %s\\n' \"'\$(cat grafana_ro_password)'\"; cat grafana-ro-role.sql; } \
        | docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q
      rm -f grafana-ro-role.sql"
    echo "role grafana_ro applied; restarting Grafana to reconnect"
    ssh "$SSH_HOST" "docker restart $APP >/dev/null 2>&1 || true"
    ;;
  status)
    ssh "$SSH_HOST" "docker inspect -f 'container {{.Name}} {{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{end}} restarts={{.RestartCount}}' $APP"
    curl -fsS -m 10 "$GRAFANA_URL/api/health" | tr -d '\n '; echo
    ssh "$SSH_HOST" "cat '$GDIR/secrets/grafana_ro_password' | docker exec -i supabase-db sh -c 'IFS= read -r PGPASSWORD; export PGPASSWORD; psql -h db -U grafana_ro -d postgres -AtXc \"select \\\$\\\$grafana_ro login OK, writable=\\\$\\\$||(select not pg_is_in_recovery())||\\\$\\\$, can_write_modules=\\\$\\\$||has_table_privilege(\\\$\\\$public.modules\\\$\\\$,\\\$\\\$UPDATE\\\$\\\$)\"'"
    ;;
  password)
    ssh "$SSH_HOST" "cat '$GDIR/secrets/grafana_admin_password'" | pbcopy
    echo "Grafana admin password copied to the clipboard (user: admin)."
    ;;
  rollback)
    confirm "GRAFANA ROLLBACK"
    if app_exists; then ssh "$SSH_HOST" "midclt call -j app.delete $APP '{\"remove_images\": false, \"remove_ixvolumes\": false, \"force_remove_ix_volumes\": false}'" >/dev/null; echo "app $APP deleted"; fi
    ssh "$SSH_HOST" "docker exec supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q -c 'DROP OWNED BY grafana_ro' -c 'DROP ROLE IF EXISTS grafana_ro'" 2>&1 | grep -v 'does not exist' || true
    echo "role grafana_ro dropped. Config/data kept in $GDIR."
    ;;
  -h|--help|"") sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//' ;;
  *) echo "unknown command: $cmd" >&2; exit 1 ;;
esac
