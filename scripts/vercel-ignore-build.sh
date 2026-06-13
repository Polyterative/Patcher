#!/usr/bin/env bash
# Vercel "Ignored Build Step" gate.
#
# Vercel exit-code semantics (per docs):
#   exit 0 → SKIP deployment
#   exit 1 → PROCEED with deployment
#
# Strategy:
#   1. Develop preview and production deploys are orchestrated by GitHub
#      Actions after the checks pass, so automatic Vercel Git builds for those
#      branches are skipped.
#   2. If the diff only touches docs / .github / *.md / *.txt → skip (matches
#      the historical ignoreCommand behaviour).
#   3. Otherwise poll the GitHub Actions check-runs for this commit and only
#      skip when a visible check has a failing conclusion. If checks are
#      unavailable or never appear, proceed so Vercel can run its own build.

set -uo pipefail

OWNER="${VERCEL_GIT_REPO_OWNER:-Polyterative}"
REPO="${VERCEL_GIT_REPO_SLUG:-Patcher}"
SHA="${VERCEL_GIT_COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null || true)}"
REF="${VERCEL_GIT_COMMIT_REF:-$(git branch --show-current 2>/dev/null || true)}"

if [ -z "${SHA}" ]; then
  echo "[vercel-ignore] No commit SHA available — proceeding to avoid a stalled pipeline."
  exit 1
fi

if [ "${REF}" = "develop" ] || [ "${REF}" = "production" ]; then
  echo "[vercel-ignore] ${REF} deploys from GitHub Actions after checks pass — skipping automatic Vercel Git build."
  exit 0
fi

# Docs-only short-circuit. Replicates the previous ignoreCommand.
if git diff HEAD^ HEAD --name-only 2>/dev/null \
    | grep -qvE '^(internaldocs/|[^/]+\.md$|[^/]+\.txt$|\.github/)'; then
  :
else
  echo "[vercel-ignore] Only docs/.github changed — skipping deploy."
  exit 0
fi

parse_checks() {
  # Use node (always available in Vercel) to parse the check-runs JSON.
  # Prints three fields: total pending failed. Prints "api_error 0 0" when
  # GitHub returns an error payload, which can happen for private repos without
  # an API token in Vercel.
  node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
if (!Array.isArray(d.check_runs)) {
  console.log('api_error 0 0');
  process.exit(0);
}
const runs = d.check_runs || [];
const total   = runs.length;
const pending = runs.filter(r => r.status !== 'completed').length;
const bad     = ['failure','cancelled','timed_out','action_required','stale'];
const failed  = runs.filter(r => r.status === 'completed' && bad.includes(r.conclusion)).length;
console.log(total + ' ' + pending + ' ' + failed);
" 2>/dev/null || echo "api_error 0 0"
}

API="https://api.github.com/repos/${OWNER}/${REPO}/commits/${SHA}/check-runs?per_page=100"
MAX_ATTEMPTS="${VERCEL_IGNORE_MAX_ATTEMPTS:-72}"   # ~12 min @ 10s, matches the Actions timeout-minutes
SLEEP_SECONDS="${VERCEL_IGNORE_SLEEP_SECONDS:-10}"
MAX_NO_CHECK_ATTEMPTS="${VERCEL_IGNORE_MAX_NO_CHECK_ATTEMPTS:-6}"
AUTH_HEADER=()

if [ -n "${GITHUB_TOKEN:-}" ]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
elif [ -n "${GH_TOKEN:-}" ]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${GH_TOKEN}")
fi

saw_checks=0

for attempt in $(seq 1 ${MAX_ATTEMPTS}); do
  response="$(curl -sSL -H 'Accept: application/vnd.github+json' "${AUTH_HEADER[@]}" "${API}" || true)"
  read -r total pending failed <<< "$(printf '%s' "${response}" | parse_checks)"

  echo "[vercel-ignore] attempt ${attempt}/${MAX_ATTEMPTS} sha=${SHA} total=${total} pending=${pending} failed=${failed}"

  if [ "${total}" = "api_error" ]; then
    echo "[vercel-ignore] GitHub checks are unavailable — proceeding so Vercel can validate the build."
    exit 1
  fi

  if [ "${failed:-0}" -gt 0 ]; then
    echo "[vercel-ignore] At least one required check failed — skipping deploy."
    exit 0
  fi

  if [ "${total:-0}" -gt 0 ] && [ "${pending:-0}" -eq 0 ]; then
    echo "[vercel-ignore] All ${total} checks passed — proceeding with deploy."
    exit 1
  fi

  if [ "${total:-0}" -gt 0 ]; then
    saw_checks=1
  elif [ "${attempt}" -ge "${MAX_NO_CHECK_ATTEMPTS}" ]; then
    echo "[vercel-ignore] No GitHub checks appeared after $((attempt * SLEEP_SECONDS))s — proceeding so Vercel can validate the build."
    exit 1
  fi

  sleep ${SLEEP_SECONDS}
done

if [ "${saw_checks}" -eq 0 ]; then
  echo "[vercel-ignore] No GitHub checks appeared within $((MAX_ATTEMPTS * SLEEP_SECONDS))s — proceeding so Vercel can validate the build."
  exit 1
fi

echo "[vercel-ignore] Checks did not complete within $((MAX_ATTEMPTS * SLEEP_SECONDS))s — skipping deploy."
exit 0
