#!/usr/bin/env bash
#
# Read-only: has hosted's auth config changed since the snapshot that
# selfhost-auth-config.sh mirrors? (review 3 F9b, runbook §10 step 1 at T-60)
# Uses the Supabase CLI login in the macOS Keychain (or SUPABASE_ACCESS_TOKEN) for one
# Management API GET; the token and the raw response (holds secrets) never reach disk
# outside a 0600 temp file that is securely deleted. Prints only changed key names.
# Exit 0 = no drift, 1 = drift (re-export, re-run selfhost-auth-config.sh --apply).
#
# Env: PROJECT_REF (default sozmatmywjpstwidzlss), HOSTED_JSON (snapshot path).

set -euo pipefail
umask 077

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_REF="${PROJECT_REF:-sozmatmywjpstwidzlss}"
HOSTED_JSON="${HOSTED_JSON:-${REPO_ROOT}/internaldocs/private/selfhost/hosted-auth-config-2026-10-04.json}"
[ -f "${HOSTED_JSON}" ] || { echo "ERROR: snapshot missing: ${HOSTED_JSON}" >&2; exit 1; }

tok="${SUPABASE_ACCESS_TOKEN:-}"
if [ -z "${tok}" ]; then
  raw="$(security find-generic-password -s 'Supabase CLI' -a access-token -w 2>/dev/null || true)"
  tok="${raw#go-keyring-base64:}"
  [ "${tok}" != "${raw}" ] && tok="$(printf '%s' "${tok}" | base64 -D)"
  unset raw
fi
[ -n "${tok}" ] || { echo "ERROR: no Supabase access token (run 'supabase login' or set SUPABASE_ACCESS_TOKEN)." >&2; exit 1; }

tmp="$(mktemp)"; trap 'rm -P "${tmp}" 2>/dev/null || rm -f "${tmp}"' EXIT
code="$(curl -s -o "${tmp}" -w '%{http_code}' -H "Authorization: Bearer ${tok}" \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth")"
unset tok
[ "${code}" = "200" ] || { echo "ERROR: Management API HTTP ${code}." >&2; exit 1; }

python3 - "${tmp}" "${HOSTED_JSON}" <<'EOF'
import json, sys
new = json.load(open(sys.argv[1])); old = json.load(open(sys.argv[2]))
# "<set>" in the snapshot = a masked secret: only presence is compared.
diff = [k for k in sorted(set(new) | set(old))
        if old.get(k) != new.get(k) and not (old.get(k) == "<set>" and new.get(k) not in (None, ""))]
print(f"hosted auth config: {len(new)} keys, changed since snapshot: {', '.join(diff) if diff else 'none'}")
sys.exit(1 if diff else 0)
EOF
