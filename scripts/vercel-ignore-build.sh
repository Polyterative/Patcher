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
#      exact commit. If that endpoint is temporarily unavailable, fall back to
#      the required Angular Tests check-runs. Proceed only when CI completed
#      successfully. Failed, missing, or timed-out CI state skips deploy.

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
  # Prints three fields: found status conclusion. Prints "api_error none none"
  # when GitHub returns an error payload.
  compact="$(tr -d '\n\r\t ' | head -c 200000)"

  if ! printf '%s' "${compact}" | grep -q '"workflow_runs":'; then
    echo "api_error none none"
    return
  fi

  if printf '%s' "${compact}" | grep -q '"workflow_runs":\[\]'; then
    echo "0 none none"
    return
  fi

  status="$(printf '%s' "${compact}" | grep -o '"status":"[^"]*"' | head -n 1 | cut -d '"' -f 4)"
  conclusion="$(printf '%s' "${compact}" | grep -o '"conclusion":"[^"]*"' | head -n 1 | cut -d '"' -f 4)"
  echo "1 ${status:-unknown} ${conclusion:-none}"
}

parse_required_check_runs() {
  # Prints one field: success, failed, pending, or api_error.
  compact="$(tr -d '\n\r\t ' | head -c 500000)"

  if ! printf '%s' "${compact}" | grep -q '"check_runs":'; then
    echo "api_error"
    return
  fi

  for name in Lint Stylelint Unittests Functiontests Productionbuild+smoke; do
    chunk="$(printf '%s' "${compact}" | grep -o "\"name\":\"${name}\"[^}]*" | head -n 1)"

    if [ -z "${chunk}" ] || ! printf '%s' "${chunk}" | grep -q '"status":"completed"'; then
      echo "pending"
      return
    fi

    if ! printf '%s' "${chunk}" | grep -q '"conclusion":"success"'; then
      echo "failed"
      return
    fi
  done

  echo "success"
}

API="https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/angular-tests.yml/runs?head_sha=${SHA}&event=push&per_page=10"
CHECKS_API="https://api.github.com/repos/${OWNER}/${REPO}/commits/${SHA}/check-runs?per_page=100"
MAX_ATTEMPTS="${VERCEL_IGNORE_MAX_ATTEMPTS:-72}"   # ~12 min @ 10s, matches the Actions timeout-minutes
SLEEP_SECONDS="${VERCEL_IGNORE_SLEEP_SECONDS:-10}"
AUTH_HEADER=()
AUTH_SOURCE="none"

if [ -n "${GITHUB_TOKEN:-}" ]; then
  AUTH_HEADER=(-H "Authorization: token ${GITHUB_TOKEN}")
  AUTH_SOURCE="GITHUB_TOKEN"
elif [ -n "${GH_TOKEN:-}" ]; then
  AUTH_HEADER=(-H "Authorization: token ${GH_TOKEN}")
  AUTH_SOURCE="GH_TOKEN"
fi

describe_github_error() {
  input="$(cat)"
  bytes="$(printf '%s' "${input}" | wc -c | tr -d ' ')"
  compact="$(printf '%s' "${input}" | tr '\n\r\t' ' ' | cut -c 1-160)"
  message="$(printf '%s' "${input}" | tr -d '\n\r\t' | sed -n 's/.*"message"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
  status="$(printf '%s' "${input}" | tr -d '\n\r\t' | sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\{0,1\}\([^",}]*\)"\{0,1\}.*/\1/p' | head -n 1)"

  if [ -n "${message}" ]; then
    echo "status=${status:-unknown} bytes=${bytes} message=\"${message}\""
  else
    echo "status=unknown bytes=${bytes} prefix=\"${compact}\""
  fi
}

echo "[vercel-ignore] GitHub API auth source: ${AUTH_SOURCE}"

for attempt in $(seq 1 ${MAX_ATTEMPTS}); do
  response="$(curl -sSL --show-error -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2022-11-28' "${AUTH_HEADER[@]}" "${API}" || true)"
  read -r found status conclusion <<< "$(printf '%s' "${response}" | parse_workflow_run)"

  echo "[vercel-ignore] attempt ${attempt}/${MAX_ATTEMPTS} sha=${SHA} workflow_found=${found} status=${status} conclusion=${conclusion}"

  if [ "${found}" = "api_error" ]; then
    workflow_error="$(printf '%s' "${response}" | describe_github_error)"
    echo "[vercel-ignore] workflow API error: ${workflow_error}"

    checks_response="$(curl -sSL --show-error -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2022-11-28' "${AUTH_HEADER[@]}" "${CHECKS_API}" || true)"
    checks_state="$(printf '%s' "${checks_response}" | parse_required_check_runs)"
    echo "[vercel-ignore] workflow API unavailable; required_check_runs=${checks_state}"

    if [ "${checks_state}" = "api_error" ]; then
      checks_error="$(printf '%s' "${checks_response}" | describe_github_error)"
      echo "[vercel-ignore] check-runs API error: ${checks_error}"
    fi

    if [ "${checks_state}" = "success" ]; then
      echo "[vercel-ignore] Required Angular Tests check-runs passed — proceeding with deploy."
      exit 1
    fi

    if [ "${checks_state}" = "failed" ]; then
      echo "[vercel-ignore] At least one required Angular Tests check-run failed — skipping deploy."
      exit 0
    fi

    sleep ${SLEEP_SECONDS}
    continue
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
