#!/usr/bin/env bash
set -euo pipefail

# Modes (first match wins):
#   SUPABASE_SSH_HOST  self-hosted Supabase: asks the stack's postgres-meta container over SSH
#                      (optional SUPABASE_META_CONTAINER, default "supabase-meta")
#   SUPABASE_PROJECT_ID  hosted Supabase project
#   (none)               local Supabase CLI stack

OUTPUT_PATH="src/backend/database.types.ts"
TMP_PATH="$(mktemp)"
POSTGREST_VERSION="${SUPABASE_POSTGREST_VERSION:-12.0.2 (a4e00ff)}"

cleanup() {
  rm -f "$TMP_PATH"
}
trap cleanup EXIT

run_supabase() {
  if command -v supabase >/dev/null 2>&1; then
    supabase "$@"
  else
    pnpm dlx supabase "$@"
  fi
}

if [[ -n "${SUPABASE_SSH_HOST:-}" ]]; then
  META_CONTAINER="${SUPABASE_META_CONTAINER:-supabase-meta}"
  QUERY="included_schemas=public&detect_one_to_one_relationships=true&postgrest_version=$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$POSTGREST_VERSION")"
  # Same generator endpoint the Supabase CLI uses; fails on non-2xx so a bad response never overwrites the file.
  ssh -o ConnectTimeout=10 "$SUPABASE_SSH_HOST" \
    "docker exec $META_CONTAINER node -e \"fetch('http://localhost:8080/generators/typescript?$QUERY').then(async r => { const t = await r.text(); if (!r.ok) { console.error(r.status, t); process.exit(1); } process.stdout.write(t); })\"" \
    > "$TMP_PATH"
elif [[ -n "${SUPABASE_PROJECT_ID:-}" ]]; then
  run_supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public > "$TMP_PATH"
else
  run_supabase gen types typescript --local --schema public > "$TMP_PATH"
fi

if ! grep -q "export type Database" "$TMP_PATH"; then
  echo "update-backend-types: generator output looks wrong; $OUTPUT_PATH left unchanged" >&2
  exit 1
fi

mv "$TMP_PATH" "$OUTPUT_PATH"
trap - EXIT
