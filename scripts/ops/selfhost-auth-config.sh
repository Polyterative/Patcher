#!/usr/bin/env bash
# Items 18/19: make self-host Auth (GoTrue) behave like hosted.
#
# Source of truth: a masked export of hosted's auth config (Management API GET
# /v1/projects/<ref>/config/auth, secrets replaced by "<set>"), kept in gitignored
# internaldocs/private/selfhost/. From it this script builds, on the NAS:
#   - docker-compose.patcher.yml (override, untouched by upstream update.sh): GoTrue env for
#     subjects, template URLs, OTP, password length, refresh-token rotation/reuse, rate limits
#     (+ CF-Connecting-IP as the client-IP header), MFA TOTP, secure email change, SMTP
#     frequency, Google provider wired to .env (GOOGLE_ENABLED/CLIENT_ID/SECRET);
#     plus an internal-only `auth-templates` static server for the hosted email bodies.
#   - .env: SITE_URL, ADDITIONAL_REDIRECT_URLS, API_EXTERNAL_URL, SUPABASE_PUBLIC_URL,
#     JWT_EXPIRY, ENABLE_EMAIL_AUTOCONFIRM, DISABLE_SIGNUP, GOOGLE_CLIENT_ID (Google stays off).
#   - NAS app `supabase`: include path list [docker-compose.yml, docker-compose.patcher.yml].
#
# Usage (Mac, repo root):
#   bash scripts/ops/selfhost-auth-config.sh [--apply] [--site-url URL]   # default dry run
#   bash scripts/ops/selfhost-auth-config.sh --set-smtp     # hidden prompts on the NAS
#   bash scripts/ops/selfhost-auth-config.sh --set-google   # hidden prompt; enables Google
# --site-url: where email links land ({{ .SiteURL }}). Before the switch use the develop
#   preview alias; at the switch use https://patcher.xyz (runbook §10).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "$(dirname "${BASH_SOURCE[0]}")/lib/selfhost-env.sh"
selfhost_require SSH_HOST PROJECT_DIR ZFS_DATASET APP_COMPOSE COMPOSE_PROJECT
PROJECT="${PROJECT_DIR}"
HOSTED_JSON="${HOSTED_JSON:-${REPO_ROOT}/internaldocs/private/selfhost/hosted-auth-config-2026-10-04.json}"
PUBLIC_URL="${PUBLIC_URL:-https://supabase.patcher.xyz}"
SITE_URL="https://patcher-git-develop-polys-projects-01f337a7.vercel.app"
MODE=dry

while [ $# -gt 0 ]; do
  case "$1" in
    --apply) MODE=apply ;;
    --site-url) SITE_URL="$2"; shift ;;
    --set-smtp) MODE=smtp ;;
    --set-google) MODE=google ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
  shift
done

recreate_auth() {
  ssh "${SSH_HOST}" "cd ${PROJECT} && docker compose -p ${COMPOSE_PROJECT} \
    -f ${APP_COMPOSE} \
    up -d --no-deps --force-recreate auth 2>&1 | tail -1"
}

# Hidden-prompt edits of secret .env keys, done on the NAS so values never touch the Mac.
set_env_secret() { # prompt-spec... (KEY:Prompt text:secret|plain)
  local spec
  spec="$(printf '%s\n' "$@")"
  ssh -t "${SSH_HOST}" "python3 -c '
import getpass, os, shutil, time
env = \"${PROJECT}/.env\"
spec = \"\"\"${spec}\"\"\".strip().split(\"\\n\")
vals = {}
for line in spec:
    key, prompt, kind = line.split(\":\", 2)
    vals[key] = (getpass.getpass if kind == \"secret\" else input)(prompt + \": \").strip()
    if not vals[key]: raise SystemExit(\"ABORT: \" + key + \" empty, .env unchanged\")
lines = open(env).read().split(\"\\n\")
shutil.copy2(env, env + \".bak-\" + time.strftime(\"%Y%m%d-%H%M%S\") + \"-auth\")
seen = set()
for i, l in enumerate(lines):
    k = l.split(\"=\", 1)[0]
    if k in vals: lines[i] = k + \"=\" + vals[k]; seen.add(k)
lines += [k + \"=\" + v for k, v in vals.items() if k not in seen]
tmp = env + \".tmp\"; open(tmp, \"w\").write(\"\\n\".join(lines)); os.chmod(tmp, 0o600); os.replace(tmp, env)
print(\"saved: \" + \", \".join(vals))
'"
}

case "${MODE}" in
  smtp)
    echo "SMTP values for the email provider (password hidden):"
    set_env_secret "SMTP_HOST:SMTP host (e.g. smtp.resend.com):plain" "SMTP_PORT:SMTP port (465 or 587):plain" \
      "SMTP_USER:SMTP user (Resend: resend):plain" "SMTP_PASS:SMTP password / API key (hidden):secret" \
      "SMTP_ADMIN_EMAIL:From address (e.g. noreply@patcher.xyz):plain" "SMTP_SENDER_NAME:Sender name (e.g. Patcher):plain"
    recreate_auth; exit 0 ;;
  google)
    echo "Google OAuth client secret (Google Cloud Console > Credentials > the OAuth client):"
    set_env_secret "GOOGLE_SECRET:Client secret (hidden):secret" "GOOGLE_ENABLED:Type true to enable Google login now:plain"
    recreate_auth; exit 0 ;;
esac

[ -f "${HOSTED_JSON}" ] || { echo "missing ${HOSTED_JSON}" >&2; exit 1; }
WORK="$(mktemp -d)"; trap 'rm -rf "${WORK}"' EXIT

python3 - "${HOSTED_JSON}" "${WORK}" "${SITE_URL}" "${PUBLIC_URL}" <<'PY'
import json, os, sys
h, work, site_url, public_url = json.load(open(sys.argv[1])), sys.argv[2], sys.argv[3], sys.argv[4]
os.makedirs(work + "/auth-templates")
kinds = {  # GoTrue name -> hosted key stem
    "CONFIRMATION": "confirmation", "RECOVERY": "recovery", "INVITE": "invite",
    "MAGIC_LINK": "magic_link", "EMAIL_CHANGE": "email_change", "REAUTHENTICATION": "reauthentication",
}
env = {}
def q(v):  # compose-safe YAML scalar
    return json.dumps(str(v).replace("$", "$$"))
for g, stem in kinds.items():
    subj = h.get("mailer_subjects_" + stem)
    body = h.get("mailer_templates_" + stem + "_content")
    if subj: env["GOTRUE_MAILER_SUBJECTS_" + g] = subj
    if body:
        open("%s/auth-templates/%s.html" % (work, stem), "w").write(body)
        env["GOTRUE_MAILER_TEMPLATES_" + g] = "http://auth-templates:8080/%s.html" % stem
b = lambda k: "true" if h.get(k) else "false"
env.update({
    "GOTRUE_MAILER_OTP_EXP": h["mailer_otp_exp"], "GOTRUE_MAILER_OTP_LENGTH": h["mailer_otp_length"],
    "GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED": b("mailer_secure_email_change_enabled"),
    "GOTRUE_SMTP_MAX_FREQUENCY": "%ss" % h["smtp_max_frequency"],
    "GOTRUE_PASSWORD_MIN_LENGTH": h["password_min_length"],
    "GOTRUE_SECURITY_REFRESH_TOKEN_ROTATION_ENABLED": b("refresh_token_rotation_enabled"),
    "GOTRUE_SECURITY_REFRESH_TOKEN_REUSE_INTERVAL": h["security_refresh_token_reuse_interval"],
    "GOTRUE_RATE_LIMIT_EMAIL_SENT": h["rate_limit_email_sent"],
    "GOTRUE_RATE_LIMIT_TOKEN_REFRESH": h["rate_limit_token_refresh"],
    "GOTRUE_RATE_LIMIT_VERIFY": h["rate_limit_verify"],
    "GOTRUE_RATE_LIMIT_OTP": h["rate_limit_otp"],
    "GOTRUE_RATE_LIMIT_ANONYMOUS_USERS": h["rate_limit_anonymous_users"],
    "GOTRUE_RATE_LIMIT_SMS_SENT": h["rate_limit_sms_sent"],
    # Per-client limits behind Cloudflare: every request reaches envoy from the tunnel.
    "GOTRUE_RATE_LIMIT_HEADER": "CF-Connecting-IP",
    "GOTRUE_MFA_TOTP_ENROLL_ENABLED": b("mfa_totp_enroll_enabled"),
    "GOTRUE_MFA_TOTP_VERIFY_ENABLED": b("mfa_totp_verify_enabled"),
    "GOTRUE_MFA_MAX_ENROLLED_FACTORS": h["mfa_max_enrolled_factors"],
    "GOTRUE_EXTERNAL_GOOGLE_ENABLED": "${GOOGLE_ENABLED:-false}",
    "GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID": "${GOOGLE_CLIENT_ID:-}",
    "GOTRUE_EXTERNAL_GOOGLE_SECRET": "${GOOGLE_SECRET:-}",
    "GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI": "${API_EXTERNAL_URL}/callback",
})
lines = ["# Generated by scripts/ops/selfhost-auth-config.sh from hosted's auth config. Do not edit.",
         "services:", "  auth:", "    depends_on:", "      auth-templates:", "        condition: service_healthy",
         "    environment:"]
for k, v in env.items():
    raw = k.startswith("GOTRUE_EXTERNAL_GOOGLE")  # keep ${...} interpolation
    lines.append("      %s: %s" % (k, json.dumps(str(v)) if raw else q(v)))
lines += ["  auth-templates:", "    container_name: supabase-auth-templates", "    image: busybox:1.37",
          "    restart: unless-stopped", "    command: [\"httpd\", \"-f\", \"-p\", \"8080\", \"-h\", \"/www\"]",
          "    volumes:", "      - ./volumes/auth-templates:/www:ro",
          "    healthcheck:", "      test: [\"CMD\", \"wget\", \"-q\", \"--spider\", \"http://127.0.0.1:8080/recovery.html\"]",
          "      interval: 30s", "      timeout: 5s", "      retries: 3"]
open(work + "/docker-compose.patcher.yml", "w").write("\n".join(lines) + "\n")
dotenv = {
    "SITE_URL": site_url,
    "ADDITIONAL_REDIRECT_URLS": h["uri_allow_list"],
    "API_EXTERNAL_URL": public_url + "/auth/v1",
    "SUPABASE_PUBLIC_URL": public_url,
    "JWT_EXPIRY": str(h["jwt_exp"]),
    "ENABLE_EMAIL_AUTOCONFIRM": b("mailer_autoconfirm"),
    "DISABLE_SIGNUP": b("disable_signup"),
    "ENABLE_EMAIL_SIGNUP": b("external_email_enabled"),
    "GOOGLE_CLIENT_ID": h["external_google_client_id"] or "",
}
json.dump(dotenv, open(work + "/dotenv.json", "w"))
print("GoTrue env in override: %d keys; templates: %s" % (len(env), ", ".join(sorted(os.listdir(work + "/auth-templates")))))
PY

echo "== .env changes (server; current -> new)"
ssh "${SSH_HOST}" "python3 -c '
import json, sys
new = json.loads(sys.stdin.read())
cur = dict(l.split(\"=\", 1) for l in open(\"${PROJECT}/.env\").read().split(\"\\n\") if \"=\" in l and not l.startswith(\"#\"))
for k, v in new.items():
    c = cur.get(k, \"<unset>\")
    print((\"  same \" if c == v else \"  SET  \") + k + \": \" + (c[:70] if c != v else \"\") + (\" -> \" + v[:90] if c != v else v[:60]))
'" < "${WORK}/dotenv.json"

if [ "${MODE}" != apply ]; then
  echo "Dry run. Re-run with --apply (snapshot, backups, app include change, stack redeploy)."
  exit 0
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
ssh "${SSH_HOST}" "midclt call zfs.snapshot.create '{\"dataset\":\"${ZFS_DATASET}\",\"name\":\"pre-auth-config-${stamp}\"}' >/dev/null && echo snapshot pre-auth-config-${stamp}"
ssh "${SSH_HOST}" "mkdir -p ${PROJECT}/volumes/auth-templates"
scp -q "${WORK}"/auth-templates/*.html "${SSH_HOST}:${PROJECT}/volumes/auth-templates/"
scp -q "${WORK}/docker-compose.patcher.yml" "${SSH_HOST}:${PROJECT}/docker-compose.patcher.yml"
ssh "${SSH_HOST}" "python3 -c '
import json, os, shutil, sys
env = \"${PROJECT}/.env\"
new = json.loads(sys.stdin.read())
shutil.copy2(env, env + \".bak-${stamp}-auth\")
lines = open(env).read().split(\"\\n\")
seen = set()
for i, l in enumerate(lines):
    k = l.split(\"=\", 1)[0]
    if k in new and not l.startswith(\"#\"): lines[i] = k + \"=\" + new[k]; seen.add(k)
lines += [k + \"=\" + v for k, v in new.items() if k not in seen]
tmp = env + \".tmp\"; open(tmp, \"w\").write(\"\\n\".join(lines)); os.chmod(tmp, 0o600); os.replace(tmp, env)
print(\".env updated, backup .env.bak-${stamp}-auth\")
'" < "${WORK}/dotenv.json"

# Point the NAS app at both compose files (idempotent), then redeploy.
ssh "${SSH_HOST}" "python3 - ${PROJECT}" <<'PY'
import json, subprocess, sys
project = sys.argv[1]
cfg = json.loads(subprocess.check_output(["midclt", "call", "app.config", "supabase"]))
want = [project + "/docker-compose.yml", project + "/docker-compose.patcher.yml"]
inc = cfg.get("include", [])
if len(inc) == 1 and inc[0].get("path") == want:
    print("app include already set")
else:
    cfg["include"] = [{"path": want}]
    subprocess.check_call(["midclt", "call", "-j", "app.update", "supabase",
                           json.dumps({"custom_compose_config": cfg})], stdout=subprocess.DEVNULL)
    print("app include updated + redeployed")
PY

ssh "${SSH_HOST}" "cd ${PROJECT} && docker compose -p ${COMPOSE_PROJECT} \
  -f ${APP_COMPOSE} \
  up -d 2>&1 | tail -2"
for _ in $(seq 1 40); do
  st="$(ssh "${SSH_HOST}" "docker inspect -f '{{.State.Health.Status}}' supabase-auth supabase-auth-templates 2>/dev/null | sort -u | tr '\n' ' '")"
  [ "${st}" = "healthy " ] && break; sleep 3
done
echo "auth + templates health: ${st}"
ssh "${SSH_HOST}" "docker exec supabase-auth wget -q -O- http://auth-templates:8080/recovery.html | head -c 40; echo ' ... (template reachable from auth)'"
ANON_KEY="$(grep -E '^SUPABASE_ANON_KEY=' "${REPO_ROOT}/.env" | cut -d= -f2- | tr -d '"')"
curl -s -H "apikey: ${ANON_KEY}" "${PUBLIC_URL}/auth/v1/settings" | python3 -c '
import json, sys
s = json.load(sys.stdin)
print("public /auth/v1/settings: email=%s google=%s autoconfirm=%s signup_disabled=%s phone=%s" % (
    s["external"].get("email"), s["external"].get("google"), s.get("mailer_autoconfirm"),
    s.get("disable_signup"), s["external"].get("phone")))'
