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
#   2. Otherwise poll the GitHub Actions check-runs for this commit and only
#      proceed when every required check is completed with a passing
#      conclusion. If anything fails, or checks never appear within the
#      timeout, skip the deploy (safe default).

set -uo pipefail

OWNER="${VERCEL_GIT_REPO_OWNER:-Polyterative}"
REPO="${VERCEL_GIT_REPO_SLUG:-Patcher}"
SHA="${VERCEL_GIT_COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null || true)}"

if [ -z "${SHA}" ]; then
  echo "[vercel-ignore] No commit SHA available — proceeding to avoid a stalled pipeline."
  exit 1
fi

# 1) Docs-only short-circuit. Replicates the previous ignoreCommand.
if git diff HEAD^ HEAD --name-only 2>/dev/null \
    | grep -qvE '^(internaldocs/|[^/]+\.md$|[^/]+\.txt$|\.github/)'; then
  :
else
  echo "[vercel-ignore] Only docs/.github changed — skipping deploy."
  exit 0
fi

parse_checks() {
  # Use node (always available in Vercel) to parse the check-runs JSON.
  # Prints three lines: total pending failed
  node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const runs = d.check_runs || [];
const total   = runs.length;
const pending = runs.filter(r => r.status !== 'completed').length;
const bad     = ['failure','cancelled','timed_out','action_required','stale'];
const failed  = runs.filter(r => r.status === 'completed' && bad.includes(r.conclusion)).length;
console.log(total + ' ' + pending + ' ' + failed);
" 2>/dev/null || echo "0 0 0"
}

API="https://api.github.com/repos/${OWNER}/${REPO}/commits/${SHA}/check-runs?per_page=100"
MAX_ATTEMPTS=72   # ~12 min @ 10s, matches the Actions timeout-minutes
SLEEP_SECONDS=10

for attempt in $(seq 1 ${MAX_ATTEMPTS}); do
  response="$(curl -sSL -H 'Accept: application/vnd.github+json' "${API}" || true)"
  read -r total pending failed <<< "$(printf '%s' "${response}" | parse_checks)"

  echo "[vercel-ignore] attempt ${attempt}/${MAX_ATTEMPTS} sha=${SHA} total=${total} pending=${pending} failed=${failed}"

  if [ "${failed:-0}" -gt 0 ]; then
    echo "[vercel-ignore] At least one required check failed — skipping deploy."
    exit 0
  fi

  if [ "${total:-0}" -gt 0 ] && [ "${pending:-0}" -eq 0 ]; then
    echo "[vercel-ignore] All ${total} checks passed — proceeding with deploy."
    exit 1
  fi

  sleep ${SLEEP_SECONDS}
done

echo "[vercel-ignore] Checks did not complete within $((MAX_ATTEMPTS * SLEEP_SECONDS))s — skipping deploy (safe default)."
exit 0
