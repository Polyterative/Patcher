#!/usr/bin/env bash
set -euo pipefail

OUTPUT_PATH="src/backend/database.types.ts"
TMP_PATH="$(mktemp)"

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

if [[ -n "${SUPABASE_PROJECT_ID:-}" ]]; then
  run_supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public > "$TMP_PATH"
else
  run_supabase gen types typescript --local --schema public > "$TMP_PATH"
fi

mv "$TMP_PATH" "$OUTPUT_PATH"
trap - EXIT
