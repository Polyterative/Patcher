#!/usr/bin/env bash
#
# Re-import hosted -> the existing self-host in one run: public data, auth users,
# migration history, bucket definitions, then a storage delta and the deep parity
# gate. For repeat imports (now, and the final one right before the switch);
# the first-time path (empty target, schema restore) is the runbook §4 one.
#
# Default is a READ-ONLY dry run: preflight + plan (row counts, storage delta).
# --apply then (after typing REFRESH STAGING, or --yes):
#   1. ZFS snapshot of the self-host dataset (abort if it fails)
#   2. read-only pg_dump --data-only from hosted: schema public, auth users +
#      identities (+ sessions / refresh tokens / MFA with --include-sessions),
#      supabase_migrations.schema_migrations; storage.buckets rows as upserts
#   3. ONE staging transaction, session_replication_role = replica: TRUNCATE every
#      public table, auth.users CASCADE (FK closure is checked to stay inside
#      auth), migration history; load; upsert buckets; commit
#   4. refresh the discovery matview, grants capture + replay (keeps PG17
#      MAINTAIN), verify counts / auth trigger / orphans
#   5. storage delta by SQL metadata (bucket, name, eTag, size): copy new or
#      changed objects (copy-storage-to-staging.mjs, md5-verified), delete
#      objects gone from hosted; private buckets need SOURCE_SERVICE_KEY
#   6. rm -P the dumps, run verify-staging-parity-deep.sh
# Schema is NOT re-dumped: the preflight aborts if the public table/column
# fingerprint differs (apply the new migrations to the self-host first).
#
# Safety: target must carry patcher_selfhost_marker and be a superuser login;
# source must not carry it and is only read. Dumps hold real user data: 0600 in
# gitignored backups/, securely deleted at the end (also on failure).
#
# Usage (defaults: hosted URL from .env.hosted-readonly, staging via
# with-staging-db.sh, storage key from .env.staging-key):
#   bash scripts/ops/with-staging-db.sh bash scripts/ops/refresh-staging-from-hosted.sh            # dry run
#   bash scripts/ops/with-staging-db.sh bash scripts/ops/refresh-staging-from-hosted.sh --apply
# Options: --apply, --yes, --include-sessions, --skip-storage, --skip-parity
# Env: SOURCE_DB_URL, TARGET_DB_URL, TARGET_SUPABASE_URL (default
#      http://<nas-lan-ip>:8000), TARGET_SERVICE_KEY, SOURCE_SERVICE_KEY (optional),
#      SSH_HOST (NAS), ZFS_DATASET (<zfs-dataset>), PG_DUMP (postgresql@17).

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=lib/pg-common.sh
source "${SCRIPT_DIR}/lib/pg-common.sh"
cd "${REPO_ROOT}"

APPLY=0 YES=0 SESSIONS=0 SKIP_STORAGE=0 SKIP_PARITY=0
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) sed -n '2,42p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --apply) APPLY=1 ;;
    --yes) YES=1 ;;
    --include-sessions) SESSIONS=1 ;;
    --skip-storage) SKIP_STORAGE=1 ;;
    --skip-parity) SKIP_PARITY=1 ;;
    *) echo "ERROR: unknown argument: $1" >&2; exit 1 ;;
  esac
  shift
done

if [ -z "${SOURCE_DB_URL:-}" ] && [ -f .env.hosted-readonly ]; then
  set -a; . ./.env.hosted-readonly; set +a
fi
[ -n "${SOURCE_DB_URL:-}" ] && [ -n "${TARGET_DB_URL:-}" ] || {
  echo "ERROR: SOURCE_DB_URL and TARGET_DB_URL must be set (see usage)." >&2; exit 1; }
PG_DUMP="${PG_DUMP:-/opt/homebrew/opt/postgresql@17/bin/pg_dump}"
SSH_HOST="${SSH_HOST:-NAS}"
ZFS_DATASET="${ZFS_DATASET:-<zfs-dataset>}"
TARGET_SUPABASE_URL="${TARGET_SUPABASE_URL:-http://<nas-lan-ip>:8000}"
if [ -z "${TARGET_SERVICE_KEY:-}" ] && [ -f .env.staging-key ]; then
  TARGET_SERVICE_KEY="$(grep -o 'ey[A-Za-z0-9._-]*' .env.staging-key | head -1)"
fi

AUTH_TABLES=(auth.users auth.identities)
[ "${SESSIONS}" -eq 1 ] && AUTH_TABLES+=(auth.sessions auth.refresh_tokens auth.mfa_factors auth.mfa_amr_claims)

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK="${REPO_ROOT}/backups/refresh-${STAMP}"
cleanup() { [ -d "${WORK}" ] && find "${WORK}" -type f -exec rm -P {} + 2>/dev/null; rm -rf "${WORK}"; }
trap cleanup EXIT

echo "== Preflight (read-only)"
require_selfhost_target "${TARGET_DB_URL}"
require_not_selfhost_source "${SOURCE_DB_URL}"
[ "$(pg_q "${TARGET_DB_URL}" "SELECT rolsuper FROM pg_roles WHERE rolname = current_user;")" = "t" ] || {
  echo "ERROR: target login must be a superuser (replica-mode load)." >&2; exit 1; }
s_major="$(server_major "${SOURCE_DB_URL}")"; c_major="$(client_major "${PG_DUMP}")"
[ "${c_major}" -ge "${s_major}" ] || { echo "ERROR: ${PG_DUMP} v${c_major} < source PG${s_major}." >&2; exit 1; }

s_auth="$(pg_q "${SOURCE_DB_URL}" "SELECT max(version) FROM auth.schema_migrations;")"
t_auth="$(pg_q "${TARGET_DB_URL}" "SELECT max(version) FROM auth.schema_migrations;")"
echo "GoTrue schema: source ${s_auth} / target ${t_auth}"
[[ "${t_auth}" < "${s_auth}" ]] && { echo "ERROR: target GoTrue is older than hosted — bump the auth image first (checklist 21)." >&2; exit 1; }

FP_SQL="SELECT md5(string_agg(c.relname || '.' || a.attname || ':' || format_type(a.atttypid, a.atttypmod), ',' ORDER BY c.relname COLLATE \"C\", a.attnum)) FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p');"
[ "$(pg_q "${SOURCE_DB_URL}" "${FP_SQL}")" = "$(pg_q "${TARGET_DB_URL}" "${FP_SQL}")" ] || {
  echo "ERROR: public table/column structure differs from hosted — apply the new migrations to the self-host first." >&2; exit 1; }
echo "public structure fingerprint: equal"

for t in "${AUTH_TABLES[@]}"; do
  cols_sql="SELECT attname FROM pg_attribute WHERE attrelid = '${t}'::regclass AND attnum > 0 AND NOT attisdropped AND attgenerated = '' ORDER BY 1;"
  missing="$(comm -23 <(pg_q "${SOURCE_DB_URL}" "${cols_sql}") <(pg_q "${TARGET_DB_URL}" "${cols_sql}") | paste -sd, -)"
  [ -z "${missing}" ] || { echo "ERROR: ${t} columns missing on target: ${missing}" >&2; exit 1; }
done
outside="$(pg_q "${TARGET_DB_URL}" "SELECT string_agg(conrelid::regclass::text, ',') FROM pg_constraint WHERE contype = 'f' AND confrelid IN (SELECT oid FROM pg_class WHERE relnamespace IN ('auth'::regnamespace, 'public'::regnamespace)) AND conrelid NOT IN (SELECT oid FROM pg_class WHERE relnamespace IN ('auth'::regnamespace, 'public'::regnamespace));")"
[ -z "${outside}" ] || { echo "ERROR: tables outside auth/public reference them (TRUNCATE CASCADE would reach): ${outside}" >&2; exit 1; }

COUNT_SQL="SELECT string_agg(t, ' ' ORDER BY t) FROM (SELECT 'auth.users=' || (SELECT count(*) FROM auth.users) UNION ALL SELECT 'auth.identities=' || (SELECT count(*) FROM auth.identities) UNION ALL SELECT 'history=' || (SELECT count(*) FROM supabase_migrations.schema_migrations) UNION ALL SELECT 'profiles=' || (SELECT count(*) FROM public.profiles) UNION ALL SELECT 'racks=' || (SELECT count(*) FROM public.racks) UNION ALL SELECT 'modules=' || (SELECT count(*) FROM public.modules) UNION ALL SELECT 'patches=' || (SELECT count(*) FROM public.patches) UNION ALL SELECT 'objects=' || (SELECT count(*) FROM storage.objects)) s(t);"
echo "source: $(pg_q "${SOURCE_DB_URL}" "${COUNT_SQL}")"
echo "target: $(pg_q "${TARGET_DB_URL}" "${COUNT_SQL}")"

mkdir -p "${WORK}"
OBJ_SQL="SELECT bucket_id, name, coalesce(metadata->>'eTag', ''), coalesce(metadata->>'size', '') FROM storage.objects ORDER BY 1, 2;"
psql "${SOURCE_DB_URL}" -X -v ON_ERROR_STOP=1 -tA -F$'\t' -c "${OBJ_SQL}" > "${WORK}/src-objects.tsv"
psql "${TARGET_DB_URL}" -X -v ON_ERROR_STOP=1 -tA -F$'\t' -c "${OBJ_SQL}" > "${WORK}/tgt-objects.tsv"
PRIVATE_BUCKETS="$(pg_q "${SOURCE_DB_URL}" "SELECT string_agg(id, ',') FROM storage.buckets WHERE NOT public;")"
# copy: new on source, size differs, or source eTag known and different. Zero-byte
# objects (folder placeholders) are listed separately. delete: target-only names.
awk -F'\t' -v OFS='\t' -v priv=",${PRIVATE_BUCKETS}," -v key="${SOURCE_SERVICE_KEY:-}" '
  NR == FNR { tgt[$1 FS $2] = $3 FS $4; next }
  { k = $1 FS $2; seen[k] = 1
    if (k in tgt) { split(tgt[k], v, FS); if (v[2] == $4 && ($3 == "" || v[1] == $3)) next }
    if ($4 == "0") print "empty", $1, $2
    else if (index(priv, "," $1 ",") && key == "") print "nokey", $1, $2
    else print "copy", $1, $2 }
  END { for (k in tgt) if (!(k in seen)) print "delete", k }
' "${WORK}/tgt-objects.tsv" "${WORK}/src-objects.tsv" | sort > "${WORK}/storage-plan.tsv"
echo "storage delta: $(cut -f1 "${WORK}/storage-plan.tsv" | sort | uniq -c | awk '{printf "%s=%s ", $2, $1}')(nothing listed = in sync)"
grep '^nokey' "${WORK}/storage-plan.tsv" | cut -f2 | sort | uniq -c | sed 's/^/  private, needs SOURCE_SERVICE_KEY: /' || true

if [ "${APPLY}" -ne 1 ]; then
  echo "Dry run complete — nothing written. Re-run with --apply."
  exit 0
fi

if [ "${YES}" -ne 1 ]; then
  printf 'This REPLACES staging public data, auth users and migration history. Type REFRESH STAGING: '
  read -r answer
  [ "${answer}" = "REFRESH STAGING" ] || { echo "Aborted."; exit 1; }
fi

echo "== 1. ZFS snapshot"
snap="pre-refresh-${STAMP}"
ssh "${SSH_HOST}" "midclt call zfs.snapshot.create '{\"dataset\":\"${ZFS_DATASET}\",\"name\":\"${snap}\"}' >/dev/null" \
  || { echo "ERROR: snapshot failed — nothing written." >&2; exit 1; }
echo "snapshot ${ZFS_DATASET}@${snap}"

echo "== 2. Dumps (read-only on hosted)"
auth_args=(); for t in "${AUTH_TABLES[@]}"; do auth_args+=(--table="${t}"); done
"${PG_DUMP}" "${SOURCE_DB_URL}" --data-only --no-owner --no-acl --schema=public -f "${WORK}/public.sql"
"${PG_DUMP}" "${SOURCE_DB_URL}" --data-only --no-owner --no-acl "${auth_args[@]}" -f "${WORK}/auth.sql"
"${PG_DUMP}" "${SOURCE_DB_URL}" --data-only --no-owner --no-acl --table=supabase_migrations.schema_migrations -f "${WORK}/history.sql"
pg_q "${SOURCE_DB_URL}" "SELECT format('INSERT INTO storage.buckets (id, name, owner, owner_id, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L) ON CONFLICT (id) DO UPDATE SET public = excluded.public, avif_autodetection = excluded.avif_autodetection, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;', id, name, owner, owner_id, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types) FROM storage.buckets ORDER BY id;" > "${WORK}/buckets.sql"
ls -la "${WORK}" | awk 'NR > 1 && /\.sql$/ {print "  " $NF " " $5 " bytes"}'

echo "== 3. Load (one transaction)"
psql "${TARGET_DB_URL}" -X -q -v ON_ERROR_STOP=1 --single-transaction > /dev/null <<SQL
SELECT 1 / (SELECT count(*) FROM pg_roles WHERE rolname = '${PATCHER_SELFHOST_MARKER_ROLE}')::int;
SET session_replication_role = replica;
DO \$\$ DECLARE t text; BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ') INTO t FROM pg_tables WHERE schemaname = 'public';
  EXECUTE 'TRUNCATE ' || t || ', auth.users, supabase_migrations.schema_migrations CASCADE';
END \$\$;
\i ${WORK}/public.sql
\i ${WORK}/auth.sql
\i ${WORK}/history.sql
SET search_path = public;
\i ${WORK}/buckets.sql
SET session_replication_role = origin;
SQL
echo "committed"

echo "== 4. Post-load"
pg_q "${TARGET_DB_URL}" "REFRESH MATERIALIZED VIEW public.module_discovery_snapshot;" > /dev/null && echo "discovery matview refreshed"
grants="$(SOURCE_DB_URL="${SOURCE_DB_URL}" bash "${SCRIPT_DIR}/capture-grants.sh" capture | grep -o 'backups/grants-replay-[0-9TZ]*\.sql' | head -1)"
TARGET_DB_URL="${TARGET_DB_URL}" bash "${SCRIPT_DIR}/capture-grants.sh" apply "${grants}" --commit | grep -E 'audit|ERROR|committed' || true
fail=0
s_counts="$(pg_q "${SOURCE_DB_URL}" "${COUNT_SQL}" | sed 's/ objects=[0-9]*//')"
t_counts="$(pg_q "${TARGET_DB_URL}" "${COUNT_SQL}" | sed 's/ objects=[0-9]*//')"
echo "source: ${s_counts}"; echo "target: ${t_counts}"
[ "${s_counts}" = "${t_counts}" ] || { echo "WARN: counts differ (hosted still taking writes? freeze it for the final run)"; fail=1; }
trig="$(pg_q "${TARGET_DB_URL}" "SELECT count(*) FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created' AND tgenabled = 'O';")"
[ "${trig}" = "1" ] && echo "on_auth_user_created: OK" || { echo "on_auth_user_created: MISSING"; fail=1; }
echo "orphans: $(pg_q "${TARGET_DB_URL}" "SELECT 'profiles without user ' || (SELECT count(*) FROM public.profiles p WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)) || ', users without profile ' || (SELECT count(*) FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id));")"

if [ "${SKIP_STORAGE}" -eq 0 ]; then
  echo "== 5. Storage delta"
  [ -n "${TARGET_SERVICE_KEY:-}" ] || { echo "ERROR: TARGET_SERVICE_KEY missing (or .env.staging-key)." >&2; exit 1; }
  node -e '
    const fs = require("fs"); const inv = {};
    for (const l of fs.readFileSync(process.argv[1], "utf8").split("\n")) {
      const [a, b, n] = l.split("\t"); if (a === "copy") (inv[b] = inv[b] || []).push(n);
    }
    fs.writeFileSync(process.argv[2], JSON.stringify(inv));
    console.log("to copy: " + Object.entries(inv).map(([b, l]) => b + "=" + l.length).join(" ") || "none");
  ' "${WORK}/storage-plan.tsv" "${WORK}/copy-inventory.json"
  if grep -q '^copy' "${WORK}/storage-plan.tsv"; then
    INVENTORY="${WORK}/copy-inventory.json" APPLY=1 SLOW=1 CONCURRENCY="${CONCURRENCY:-3}" \
      TARGET_SUPABASE_URL="${TARGET_SUPABASE_URL}" TARGET_SERVICE_KEY="${TARGET_SERVICE_KEY}" \
      CONFIRM_TARGET_HOST="$(node -e 'console.log(new URL(process.argv[1]).hostname)' "${TARGET_SUPABASE_URL}")" \
      node "${SCRIPT_DIR}/copy-storage-to-staging.mjs" | grep -E 'copied\+verified|saved|failed' || fail=1
  fi
  for b in $(grep '^delete' "${WORK}/storage-plan.tsv" | cut -f2 | sort -u); do
    grep "^delete	${b}	" "${WORK}/storage-plan.tsv" | cut -f3 > "${WORK}/del-${b}.txt"
    while IFS= read -r chunk; do
      code="$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "${TARGET_SUPABASE_URL}/storage/v1/object/${b}" \
        -H "apikey: ${TARGET_SERVICE_KEY}" -H "Authorization: Bearer ${TARGET_SERVICE_KEY}" \
        -H 'Content-Type: application/json' --data "${chunk}")"
      [ "${code}" = "200" ] || { echo "delete batch in ${b}: HTTP ${code}"; fail=1; }
    done < <(node -e '
      const n = require("fs").readFileSync(process.argv[1], "utf8").split("\n").filter(Boolean);
      for (let i = 0; i < n.length; i += 100) console.log(JSON.stringify({ prefixes: n.slice(i, i + 100) }));
    ' "${WORK}/del-${b}.txt")
    echo "deleted from ${b}: $(grep -c . "${WORK}/del-${b}.txt")"
  done
  nokey="$(grep -c '^nokey' "${WORK}/storage-plan.tsv" || true)"
  [ "${nokey}" = "0" ] || echo "NOT copied: ${nokey} private object(s) — set SOURCE_SERVICE_KEY to include them."
fi

echo "== 6. Cleanup + parity"
cleanup; trap - EXIT
echo "dumps securely deleted"
if [ "${SKIP_PARITY}" -eq 0 ]; then
  bash "${SCRIPT_DIR}/verify-staging-parity-deep.sh" | grep -E 'DIFF|ERROR|FAILED|passed|^[<>]' || true
fi
echo "Done (snapshot ${ZFS_DATASET}@${snap} to roll back)."
exit "${fail}"
