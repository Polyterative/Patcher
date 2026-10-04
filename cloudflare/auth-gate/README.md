# Patcher Auth Gate Worker

Turnstile check in front of the self-hosted auth endpoints that send email:
`supabase.patcher.xyz/auth/v1/{signup,recover,otp,resend}`. Login, token refresh and admin
calls are not routed here. Logic: [`src/gate.ts`](./src/gate.ts); tests: `pnpm test:functions:auth-gate`.

- Token: `gotrue_meta_security.captcha_token`, which supabase-js sends from `options.captchaToken`.
- `MODE`: `off` (passthrough), `log` (verify + log, never block), `enforce` (400 `captcha_failed`).
- Fails open if siteverify is unreachable.
- Secret: `TURNSTILE_SECRET` (widget "Patcher auth (signup + password reset)").

Deploy: `pnpm cloudflare:auth-gate:deploy`. Logs: `npx wrangler tail patcher-auth-gate`.
Rollout: [plan](../../internaldocs/workflow/plans/cloudflare-watchdog-and-turnstile.md).
