# Patcher Uptime Watchdog Worker

Cron Worker (every 5 min) that probes Patcher from Cloudflare's network and pushes to ntfy, so
alerts still arrive when the self-host machine, its link or its own health cron is down.
Logic: [`src/watchdog.ts`](./src/watchdog.ts); tests: `pnpm test:functions:uptime-watchdog`.

- Probes: `patcher.xyz`, self-host auth/rest/storage, `images.patcher.xyz`, `api.patcher.xyz` (expects 401),
  hosted auth (until `HOSTED_URL` is set to `""`).
- Alerts after `FAILS_BEFORE_ALERT` consecutive failures, reminds every `REMIND_HOURS`, recovery notice,
  daily heartbeat at `HEARTBEAT_UTC_HOUR` (silence = the watchdog itself is broken).
- Secrets: `NTFY_TOPIC` (same topic as the NAS checks), `SUPABASE_ANON_KEY`. KV binding `STATE`.

Deploy: `pnpm cloudflare:uptime-watchdog:deploy`. Logs: `npx wrangler tail patcher-uptime-watchdog`.
