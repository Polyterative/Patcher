# Cloudflare uptime watchdog + Turnstile on email-sending auth

<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

Goal: two free-tier Cloudflare additions for the self-hosted backend: (1) an outside-in uptime
watchdog that still alerts when the self-host machine or its link is down, (2) Turnstile bot
protection on signup / password-reset / OTP / resend, the endpoints that send email.

Status: watchdog live; auth gate live in `log` mode; client widget on `develop`, prod key empty.

## Layer 1 — MVP

- [x] `cloudflare/uptime-watchdog`: cron Worker every 5 min, 7 probes (site, self-host auth/rest/storage,
  image proxy, public API, hosted auth), ntfy push on 2 consecutive fails, 4 h reminder, recovery,
  daily heartbeat 07 UTC. State in KV `patcher-uptime-watchdog-state`. Deployed 2026-10-04; first live run 7/7 OK.
- [x] Turnstile widget "Patcher auth (signup + password reset)" created via API, managed mode,
  domains `patcher.xyz`, `vercel.app`, `localhost`, `127.0.0.1`. Site key `0x4AAAAAAFNy2CcbfwOPeWeo`
  (public); secret only in the `patcher-auth-gate` Worker secret.
- [x] `cloudflare/auth-gate`: Worker on `supabase.patcher.xyz/auth/v1/{signup,recover,otp,resend}*`,
  verifies `gotrue_meta_security.captcha_token` via siteverify. `MODE=log` deployed 2026-10-04;
  live probe: passthrough intact (GoTrue 400 validation), preflight 200, `/token` not routed, log line written.

## Layer 2 — Structural

- [x] Client: `TurnstileWidgetComponent` + `CaptchaState` (`shared-interproject/components/@smart/turnstile-widget/`),
  on signup and the login page reset form; token threaded through `signup$` / `resetPassword$`;
  single-use reset after every attempt; submit blocked with `captchaPending` copy until a token exists.
- [x] `environment.turnstileSiteKey` from `TURNSTILE_SITE_KEY` (dev defaults to the real key, prod defaults to empty = widget off).
- [x] CSP: `challenges.cloudflare.com` in `script-src` + new `frame-src`.
- [x] Specs: worker node tests (6 + 8), CaptchaState, data-service pending/reset cases; login+backend suites green
  except the two pre-existing `supabase.co` URL assertions that fail whenever local `.env` points at the LAN self-host.

## Layer 3 — Polish / rollout (owner-gated)

- [x] Vercel `TURNSTILE_SITE_KEY` set for Preview (develop) 2026-10-05; takes effect on the next develop build
  (develop preview already points at the self-host, so its signup/reset traffic exercises the gate).
- [ ] At the self-host cutover: set Vercel `TURNSTILE_SITE_KEY` for Production, redeploy (step added to the private switch checklist).
- [ ] After a day of `log` lines showing `pass (verified)` from real users: set `MODE` to `enforce` and redeploy the gate.
- [ ] After cutover: set watchdog `HOSTED_URL` to `""` and redeploy.

## Decision log

- **Worker gate instead of GoTrue's built-in captcha.** `GOTRUE_SECURITY_CAPTCHA_*` also gates password
  login, which would break the e2e RLS specs and every API `signInWithPassword` caller. Gating only the
  email-sending endpoints at the edge protects Resend quota and the NAS while leaving login untouched.
  Rejected: GoTrue native captcha (breaks e2e), Cloudflare WAF/Bot rules (token lacks zone write).
- **Fail open** when siteverify is unreachable: Cloudflare's own verifier being down must not block signups.
- **`log` before `enforce`**: clients cached before the widget shipped would otherwise fail signup.
- Watchdog alerts after 2 consecutive failures (10 min) to skip single blips; KV written only when a
  probe is failing or changes state (free tier: 1000 writes/day).
- Watchdog shares the NAS ntfy topic (pulled over SSH at deploy, stored as a Worker secret) so all
  alerts land in one subscription; titles say "Cloudflare watchdog" to tell them apart.
- Interactive "Verify you are human" appears in automated browsers; real browsers usually pass invisibly
  (`appearance: interaction-only`).
