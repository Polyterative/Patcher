#!/usr/bin/env bash
# Vercel "Ignored Build Step" gate.
#
# Vercel exit-code semantics (per docs):
#   exit 0 → SKIP deployment
#   exit 1 → PROCEED with deployment
#
# Strategy:
#   1. If the diff only touches docs / .github / *.md / *.txt → skip (matches
#      the historical ignoreCommand behaviour).
#   2. Otherwise poll the Angular Tests GitHub Actions workflow run for this
#      exact commit. Proceed only when that workflow completed successfully.
#      Failed, missing, unavailable, or timed-out workflow state skips deploy.

set -uo pipefail

OWNER="${VERCEL_GIT_REPO_OWNER:-Polyterative}"
REPO="${VERCEL_GIT_REPO_SLUG:-Patcher}"
SHA="${VERCEL_GIT_COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null || true)}"

if [ -z "${SHA}" ]; then
  echo "[vercel-ignore] No commit SHA available — skipping deploy."
  exit 0
fi

changed_files="$(git diff HEAD^ HEAD --name-only 2>/dev/null || git show --pretty='' --name-only HEAD 2>/dev/null || true)"

if [ -n "${changed_files}" ] && ! printf '%s\n' "${changed_files}" \
    | grep -qvE '^(internaldocs/|[^/]+\.md$|[^/]+\.txt$|\.github/)'; then
  echo "[vercel-ignore] Only docs/.github changed — skipping deploy."
  exit 0
fi

parse_workflow_run() {
  # Use node (always available in Vercel) to parse the workflow-runs JSON.
  # Prints three fields: found status conclusion. Prints "api_error none none"
  # when GitHub returns an error payload.
  node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
if (!Array.isArray(d.workflow_runs)) {
  console.log('api_error none none');
  process.exit(0);
}
const runs = d.workflow_runs || [];
const run = runs
  .filter(r => r.event === 'push')
  .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
if (!run) {
  console.log('0 none none');
  process.exit(0);
}
console.log('1 ' + (run.status || 'unknown') + ' ' + (run.conclusion || 'none'));
" 2>/dev/null || echo "api_error none none"
}

API="https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/angular-tests.yml/runs?head_sha=${SHA}&event=push&per_page=10"
MAX_ATTEMPTS="${VERCEL_IGNORE_MAX_ATTEMPTS:-72}"   # ~12 min @ 10s, matches the Actions timeout-minutes
SLEEP_SECONDS="${VERCEL_IGNORE_SLEEP_SECONDS:-10}"
AUTH_HEADER=()

if [ -n "${GITHUB_TOKEN:-}" ]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
elif [ -n "${GH_TOKEN:-}" ]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${GH_TOKEN}")
fi

for attempt in $(seq 1 ${MAX_ATTEMPTS}); do
  response="$(curl -sSL -H 'Accept: application/vnd.github+json' "${AUTH_HEADER[@]}" "${API}" || true)"
  read -r found status conclusion <<< "$(printf '%s' "${response}" | parse_workflow_run)"

  echo "[vercel-ignore] attempt ${attempt}/${MAX_ATTEMPTS} sha=${SHA} workflow_found=${found} status=${status} conclusion=${conclusion}"

  if [ "${found}" = "api_error" ]; then
    echo "[vercel-ignore] GitHub workflow status is unavailable — skipping deploy."
    exit 0
  fi

  if [ "${found}" = "1" ] && [ "${status}" = "completed" ] && [ "${conclusion}" = "success" ]; then
    echo "[vercel-ignore] Angular Tests completed successfully — proceeding with deploy."
    exit 1
  fi

  if [ "${found}" = "1" ] && [ "${status}" = "completed" ]; then
    echo "[vercel-ignore] Angular Tests completed with conclusion=${conclusion} — skipping deploy."
    exit 0
  fi

  sleep ${SLEEP_SECONDS}
done

echo "[vercel-ignore] Angular Tests did not complete successfully within $((MAX_ATTEMPTS * SLEEP_SECONDS))s — skipping deploy."
exit 0
