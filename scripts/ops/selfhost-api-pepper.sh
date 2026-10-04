#!/usr/bin/env bash
#
# Carry the Public Open API pepper (Vault secret api_key_pepper) onto the
# self-host and PROVE it is the hosted value (review 3 F2). Owner-run from the
# repo root; works over `ssh NAS` + docker exec.
#
# Why a proof is possible without reading hosted: every API key's stored hash is
# HMAC-SHA256(raw key bytes, pepper), and the hashes were copied from hosted. The
# CI smoke key (PATCHER_PUBLIC_API_KEY in .env.public-api-smoke) is a real key,
# so HMAC(smoke key, self-host pepper) = its stored key_hash  <=>  the self-host
# pepper is the one hosted (and the Worker secret API_KEY_PEPPER) minted with.
# The query returns only MATCH / MISMATCH / NO_PEPPER / NO_KEY_ROW.
#
#   (no flag)  read-only: pepper present? proof.
#   --apply    prompt for the hosted pepper (hidden, never echoed / on argv /
#              in history), check it is base64 of 32 bytes, then in ONE
#              transaction create or update the Vault secret and run the proof;
#              anything but MATCH rolls back, so a wrong value never lands.
#
# Where the owner gets the hosted value (read-only): hosted dashboard -> SQL editor
#   select decrypted_secret from vault.decrypted_secrets where name = 'api_key_pepper';
# (or the password-manager copy made when the API launched). Same value as the
# Worker secret API_KEY_PEPPER — that one stays untouched.
#
# Env: SSH_HOST (default NAS), PATCHER_PUBLIC_API_KEY (else read from
#      .env.public-api-smoke).

set -euo pipefail
umask 077

SSH_HOST="${SSH_HOST:-NAS}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APPLY=0
for arg in "$@"; do
  case "${arg}" in
    --apply) APPLY=1 ;;
    -h|--help) sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "ERROR: unknown argument: ${arg}" >&2; exit 1 ;;
  esac
done

if [ -z "${PATCHER_PUBLIC_API_KEY:-}" ] && [ -f "${REPO_ROOT}/.env.public-api-smoke" ]; then
  PATCHER_PUBLIC_API_KEY="$(grep '^PATCHER_PUBLIC_API_KEY=' "${REPO_ROOT}/.env.public-api-smoke" | cut -d= -f2- | tr -d "\"' ")"
fi
[[ "${PATCHER_PUBLIC_API_KEY:-}" =~ ^pk_live_[A-Za-z0-9_-]{22}$ ]] || {
  echo "ERROR: PATCHER_PUBLIC_API_KEY (pk_live_ + 22 chars) needed for the proof (.env.public-api-smoke)." >&2; exit 1; }

db() { ssh "${SSH_HOST}" "docker exec -i supabase-db psql -U supabase_admin -d postgres -AtX -q -v ON_ERROR_STOP=1"; }

# Proof expression; :'k' = smoke key. Raw bytes = base64url suffix (22 chars + '==').
PROOF="SELECT CASE
  WHEN (SELECT count(*) FROM vault.decrypted_secrets WHERE name = 'api_key_pepper') <> 1 THEN 'NO_PEPPER'
  WHEN NOT EXISTS (SELECT 1 FROM public.api_keys WHERE key_prefix = left(:'k', 15)) THEN 'NO_KEY_ROW'
  WHEN EXISTS (SELECT 1 FROM public.api_keys a WHERE a.key_prefix = left(:'k', 15)
    AND a.key_hash = extensions.hmac(decode(translate(substr(:'k', 9), '-_', '+/') || '==', 'base64'),
      decode((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'api_key_pepper'), 'base64'), 'sha256'))
  THEN 'MATCH' ELSE 'MISMATCH' END"

marker="$(echo "SELECT count(*) FROM pg_roles WHERE rolname = 'patcher_selfhost_marker';" | db)"
[ "${marker}" = "1" ] || { echo "ERROR: patcher_selfhost_marker missing — this is not the self-host." >&2; exit 1; }

if [ "${APPLY}" -ne 1 ]; then
  result="$(printf '\\set k %s\n%s;\n' "${PATCHER_PUBLIC_API_KEY}" "${PROOF}" | db)"
  echo "api_key_pepper on self-host: ${result}"
  [ "${result}" = "MATCH" ] && echo "OK: self-host pepper = hosted pepper (smoke key validates)." \
    || echo "Not carried yet / wrong — run with --apply."
  [ "${result}" = "MATCH" ]
  exit $?
fi

printf 'Hosted api_key_pepper (input hidden): '
IFS= read -rs pepper; echo
pepper="$(printf '%s' "${pepper}" | tr -d '[:space:]')"
[[ "${pepper}" =~ ^[A-Za-z0-9+/]{43}=$ ]] || { echo "ERROR: not base64 of 32 bytes (expect 44 chars ending in '=')." >&2; exit 1; }
[ "$(printf '%s' "${pepper}" | base64 -D 2>/dev/null | wc -c | tr -d ' ')" = "32" ] || {
  echo "ERROR: does not decode to 32 bytes." >&2; exit 1; }

# Everything on stdin; the final SELECT divides by zero unless MATCH -> rollback.
result="$(db <<SQL 2>&1
\\set p ${pepper}
\\set k ${PATCHER_PUBLIC_API_KEY}
BEGIN;
SELECT vault.update_secret(id, :'p') FROM vault.secrets WHERE name = 'api_key_pepper';
SELECT vault.create_secret(:'p', 'api_key_pepper', 'Public Open API key HMAC pepper (hosted value, carried verbatim)')
  WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'api_key_pepper');
SELECT 1 / (CASE WHEN (${PROOF}) = 'MATCH' THEN 1 ELSE 0 END);
COMMIT;
SQL
)" && rc=0 || rc=$?
unset pepper
if [ "${rc}" -ne 0 ]; then
  if printf '%s' "${result}" | grep -q 'division by zero'; then
    echo "MISMATCH: that value does not validate the smoke key — rolled back, nothing changed." >&2
  else
    echo "ERROR: write failed, rolled back: $(printf '%s' "${result}" | grep -m1 '^ERROR:' | sed -E 's#[A-Za-z0-9+/]{43}=#<redacted>#g')" >&2
  fi
  exit 1
fi
echo "api_key_pepper on self-host: $(printf '\\set k %s\n%s;\n' "${PATCHER_PUBLIC_API_KEY}" "${PROOF}" | db)"
echo "OK: pepper stored and proven (smoke key validates against its stored hash)."
