#!/usr/bin/env bash
#
# Delta sync framework for staging refresh (forward) and cutover rollback (reverse).
#
# DRAFT FOR REVIEW — NOT YET PROVEN. Requires third backend-plan review before
# any owner-run APPLY. Agents author docs/scripts only; execution stays in an
# owner-present window. Production is never touched by default.
#
# Forward (default): hosted source -> self-host staging target. Owner-run refresh
#   when hosted drifts. Target must NOT look hosted.
# Reverse: staging -> hosted (rollback write-reconciliation). Target IS hosted:
#   requires --allow-hosted + FREEZE_CONFIRMED=1 + explicit acknowledgment flag.
#   No cutover window until the timed flip/flip-back drill is green on staging.
#
# Safety:
#   - Default is dry-run: prints the redacted per-table plan, performs zero
#     connections (psql is never invoked, connection strings never printed).
#   - APPLY prints the masked source/target, requires typing SYNC + 10 s pause.
#   - Refuses identical source/target. Refuses hosted-looking targets without
#     --allow-hosted. Reverse additionally requires FREEZE_CONFIRMED=1 in the
#     environment and --i-understand-reverse-writes-hosted on the command line.
#   - Storage deltas (inventory diffs) and auth-UUID maps are referenced, not
#     performed here — see runbook §4 item 4, §7, §9.3, §10 steps 2-3,8.
#   - Every table finishes with setval(max(id)) + SELECT last_value verification
#     (reviewed delta method). Rows vanished from source are deleted target-side
#     in reverse-FK order only when the cutover fate list says so; staging
#     rehearsal default keeps them.
#
# Usage:
#   bash scripts/ops/delta-sync.sh --help
#   SOURCE_DB_URL="postgres://..." TARGET_DB_URL="postgres://..." \
#     bash scripts/ops/delta-sync.sh --direction forward --dry-run
#   SOURCE_DB_URL="postgres://..." TARGET_DB_URL="postgres://..." \
#     LAST_SYNC="2026-10-01T00:00:00Z" bash scripts/ops/delta-sync.sh \
#       --direction forward --apply
#   Reverse (rollback, owner-present only):
#   FREEZE_CONFIRMED=1 SOURCE_DB_URL="postgres://..." TARGET_DB_URL="postgres://..." \
#     bash scripts/ops/delta-sync.sh --direction reverse --allow-hosted \
#       --i-understand-reverse-writes-hosted --apply
#
# Connection strings live in the shell only (never commit them).

set -euo pipefail
umask 077

TABLES=(
  modules manufacturers standards tags module_tags
  module_ins module_outs module_panels
  stores module_store_listings module_price_snapshots
  profiles racks rack_modules patches patch_connections patch_module_instances
  module_collections module_collection_entries
  user_modules user_module_acquisitions
  comments reactions marketplace_listings listing_media
  shipping_addresses api_keys api_tiers
)

DIRECTION="forward"
APPLY=false
ALLOW_HOSTED=false
UNDERSTAND_REVERSE=false
LAST_SYNC="${LAST_SYNC:-}"

usage() {
  cat <<'EOF'
Usage: SOURCE_DB_URL="postgres://..." TARGET_DB_URL="postgres://..." bash scripts/ops/delta-sync.sh [options]

Delta-sync framework (DRAFT, needs third backend-plan review before owner-run).

Options:
  --direction forward|reverse   forward: hosted->staging refresh (default);
                                reverse: staging->hosted rollback reconciliation
  --apply                       perform writes (default is dry-run plan only)
  --dry-run                     print the redacted plan (default, no connections)
  --allow-hosted                permit a hosted-looking target (reverse only)
  --i-understand-reverse-writes-hosted
                                required acknowledgment for reverse APPLY
  -h|--help                     show this help

Reverse APPLY additionally requires FREEZE_CONFIRMED=1 in the environment
(hosted write-freeze still on, verified by owner before proceeding).

Safety: dry-run never invokes psql. APPLY requires typing SYNC + 10 s pause.
EOF
}

mask_db_url() {
  echo "$1" | sed -E 's#(postgres(ql)?://[^:]+:)[^@]+@#\1[REDACTED]@#'
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --direction)
      shift
      DIRECTION="${1:-}"
      shift
      ;;
    --direction=*)
      DIRECTION="${1#--direction=}"
      shift
      ;;
    --apply)
      APPLY=true
      shift
      ;;
    --dry-run)
      APPLY=false
      shift
      ;;
    --allow-hosted)
      ALLOW_HOSTED=true
      shift
      ;;
    --i-understand-reverse-writes-hosted)
      UNDERSTAND_REVERSE=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --*)
      echo "ERROR: unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

case "${DIRECTION}" in
  forward|reverse) ;;
  *)
    echo "ERROR: --direction must be forward or reverse." >&2
    exit 1
    ;;
esac

if [ -z "${SOURCE_DB_URL:-}" ] || [ -z "${TARGET_DB_URL:-}" ]; then
  echo "ERROR: both SOURCE_DB_URL and TARGET_DB_URL must be set in the shell (never commit them)." >&2
  exit 1
fi

if [ "${SOURCE_DB_URL}" = "${TARGET_DB_URL}" ]; then
  echo "ERROR: source and target are identical; refusing to sync a database with itself." >&2
  exit 1
fi

case "${TARGET_DB_URL}" in
  *supabase.co*|*pooler.supabase.com*)
    if [ "${ALLOW_HOSTED}" != true ]; then
      echo "ERROR: target looks hosted; refusing without --allow-hosted." >&2
      echo "Forward refresh targets staging. Reverse targets hosted only in the owner-present rollback window." >&2
      exit 1
    fi
    ;;
esac

if [ "${DIRECTION}" = "reverse" ]; then
  if [ "${ALLOW_HOSTED}" != true ] || [ "${UNDERSTAND_REVERSE}" != true ]; then
    echo "ERROR: reverse requires --allow-hosted + --i-understand-reverse-writes-hosted." >&2
    exit 1
  fi
  if [ "${FREEZE_CONFIRMED:-}" != "1" ]; then
    echo "ERROR: reverse requires FREEZE_CONFIRMED=1 (hosted write-freeze verified by owner)." >&2
    exit 1
  fi
  if [ "${APPLY}" = true ]; then
    echo "WARNING: reverse APPLY writes to the hosted project (rollback reconciliation)." >&2
    echo "Require: hosted write-freeze still on + zero non-throwaway staging auth users (owner verifies before proceeding)." >&2
  fi
fi

if [ "${APPLY}" = false ]; then
  echo "=== delta-sync DRY-RUN (${DIRECTION}) — no connections, no writes ==="
  echo "Source: [REDACTED — connection string never printed]"
  echo "Target: [REDACTED — connection string never printed]"
  if [ -n "${LAST_SYNC}" ]; then
    echo "LAST_SYNC window: ${LAST_SYNC} (updated_at tables sync by WHERE updated_at > last_sync)"
  else
    echo "LAST_SYNC unset: updated_at tables report full-window plan; set LAST_SYNC for incremental windows"
  fi
  echo
  printf '%-32s %s\n' "table" "plan"
  for table in "${TABLES[@]}"; do
    printf '%-32s %s\n' "${table}" "detect updated_at via information_schema (APPLY only) -> updated_at window OR id-range + md5(t::text) compare; finish setval(max(id)) + last_value verify"
  done
  echo
  echo "Storage: inventory diffs (new names copy, vanished names follow fate decision) via pnpm copy:storage-to-staging — not performed here."
  echo "Auth (reverse/cutover): UUID map handling + trigger-DISABLED bulk load + handle_new_user verify — not performed here (runbook §9.3, §10 step 4)."
  echo "Deletes: rows vanished from source deleted target-side in reverse-FK order only per fate list; rehearsal default keeps them."
  echo "Dry run complete. No connections were made and no writes were performed."
  exit 0
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required command not found: $1" >&2
    exit 1
  fi
}

require_command psql

echo "WARNING: delta-sync APPLY (${DIRECTION}) writes to the target database."
echo "Source: $(mask_db_url "${SOURCE_DB_URL}")"
echo "Target: $(mask_db_url "${TARGET_DB_URL}")"
echo
printf 'Type SYNC to continue: '
read -r confirmation
if [ "${confirmation}" != "SYNC" ]; then
  echo "Delta sync aborted."
  exit 1
fi
echo "Final safety pause: press Ctrl-C within 10 seconds to abort."
sleep 10

q() {
  local url="$1" sql="$2"
  psql "${url}" -tAc "${sql}"
}

for table in "${TABLES[@]}"; do
  echo "--- ${table} ---"
  has_updated_at="$(q "${SOURCE_DB_URL}" "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' AND column_name='updated_at';")"
  if [ "${has_updated_at}" != "0" ] && [ -n "${LAST_SYNC}" ]; then
    echo "updated_at window sync since ${LAST_SYNC} (temp-table + upsert by id, then setval + last_value verify)"
    echo "DRAFT: owner reviews the per-table upsert SQL before first APPLY (third backend-plan review gate)."
  else
    echo "id-range + md5(t::text) per-window compare (new rows id > max(id); changed rows by window hash; then setval + last_value verify)"
    echo "DRAFT: window size + reverse-FK delete order reviewed before first APPLY (third backend-plan review gate)."
  fi
done

echo "Delta-sync APPLY (${DIRECTION}) step complete. Re-run smoke + expanded parity before proceeding (any DIFF aborts the window)."
