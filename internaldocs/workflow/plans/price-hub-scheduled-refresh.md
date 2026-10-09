# Price Hub scheduled full refresh on the self-host NAS

<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

Goal: run the full Price Hub crawl + match + import (`refresh-local --store=all`) every three days
on the self-host NAS instead of by hand on the owner's Mac. Make it resumable and bounded, and have it
report progress and failures to the owner's phone over the existing ntfy topic.

Status: live since 2026-10-09. The NAS cron job runs every 3 days at 03:00 UTC, and the dead-man check is armed.
Open work: the per-store crawler failures listed in Layer 3.

## Layer 1 — MVP

- [x] `refresh-local.ts`: export `refreshStore`, `resolveModules` and the client factory so a wrapper can drive stores one at a time.
- [x] `scripts/price-hub/scheduled-refresh.ts`: per-store loop with resume checkpoint, per-store timeout +
  retry, run deadline, SIGTERM-safe state, ntfy start / progress / failure / final pushes, `last-run.json`.
- [x] `scripts/price-hub/docker/`: `node:24-trixie-slim` + `curl` image with only the Price Hub sources plus `@supabase/supabase-js`.
- [x] `scripts/ops/price-hub-refresh-nas.sh`: Mac-side `--install` (sync + build on the NAS), `--run`, `--dry-run`,
  `--status`, `--logs`, `--enable-cron` / `--disable-cron`; NAS-side runner with single-run guard + log pruning.
- [x] Node tests for the pure planning/formatting helpers.
- [x] NAS env file created 2026-10-09 (0600, owner-run) from the self-host's own service-role key; the key never left the NAS.
- [x] `--install` + single-store `--dry-run` on the NAS: DB read over the LAN and ntfy pushes OK (2026-10-09).
- [x] Full `--dry-run` on the NAS (2026-10-09): 55 min, 50/53 stores; it would deactivate 25 (≤ 10 per store).

## Layer 2 — Structural

- [x] Dead-man check: `selfhost-health-remote.sh` FAILs once the cron job is armed (`cron-enabled` marker) and no
  live run has finished for 4 days. A non-ok last run is a WARN, because ntfy already pushed the details.
- [x] First live `--run` (2026-10-09): 1 h 24 min, PARTIAL, 46/53 imported, 1254 snapshots, 13038 listings,
  28 deactivated. Production DB showed the refreshed `last_checked_at` rows.
- [x] Cron enabled (owner-approved 2026-10-09): NAS cron job, every 3 days at 03:00 UTC.

## Layer 3 — Polish

- [ ] Per-store crawler failures from the first live run. None are NAS-specific; each fails the same way from the Mac:
  - Shopify 429 (`control`, `found-sound`, `moog-audio`): 1.5 s pacing between pages and a 60 s retry-wait cap added
    2026-10-09 (the crawler already honoured `Retry-After`). Confirm in the next scheduled run.
  - `signal-sounds-uk`: the store returns 403 on its BigCommerce sitemap (bot block).
  - `escape-from-noise`: 0 products, because the site's pages no longer expose usable product metadata.
  - `control-voltage`: its HTML catalog pages fan out into hundreds of filter/sort URLs (200 visited, 787 queued),
    so a higher file limit does not help. It needs catalog-URL canonicalisation or include filters. (Fixed on the way:
    already-visited leftovers no longer count as "hit the file limit".)
  - `whimsical-raps`: the store's DNS round-robins to a host with a self-signed certificate (also fails on the Mac).

- [ ] Decide whether the bounded edge snapshot worker is still needed once the full refresh is reliable.
- [ ] Optional Grafana run-history panel. Needs a `price_hub_runs` table, so it goes through the backend-plan-reviewer gate first.

## Operating notes

- State lives in `$OPS_DIR/price-hub/state` on the NAS: `current-run.json` (checkpoint), `last-run.json`
  (last live run), `last-dry-run.json`, `out/` (per-store crawl files), `logs/` (14-day retention).
- Resume: a run that started less than `PRICE_HUB_RESUME_MAX_AGE_H` (24 h) ago and did not finish is continued,
  skipping stores already completed. Older checkpoints are discarded and a fresh run starts.
- Retries apply only to thrown errors (network, timeouts). Stores that the sanity gates mark `skipped` are not retried.
- The wrapper always runs with `--store=all` semantics unless a store is given explicitly, so the strict
  full-catalog gates and the deactivation guard from the README stay in force.
- Secrets: the service-role key exists only in the NAS env file; the ntfy topic is the existing `$OPS_DIR/ntfy-topic`.
  Push bodies carry store slugs and counts only.

## Decision log

- 2026-10-09: Run on the NAS (always on, LAN-local to the self-host DB) instead of the Mac (sleep, travel, network).
- 2026-10-09: One-shot `docker run --rm` from a NAS cron job, not a long-running app. The job is batch work, so
  nothing should sit idle between runs. The container name doubles as the single-run lock.
- 2026-10-09: Wrapper script around the exported `refreshStore` instead of growing `refresh-local.ts`. The manual
  Mac workflow keeps working unchanged.
- 2026-10-09: Image is built on the NAS from a synced minimal context (amd64 native, no registry, no cross-build).
  Only `@supabase/supabase-js` is installed, not the whole Angular dependency tree.
- 2026-10-09: Progress reporting uses ntfy and files, with no schema change. A run-history table is deferred to
  Layer 3 behind the backend review gate.
- 2026-10-09: Per-store timeout cannot cancel in-flight crawl work. The wrapper marks the store failed, moves on,
  and calls `process.exit` at the end so dangling work dies with the container.
- 2026-10-09: Production has been on the self-host since 2026-10-07, so the job writes to the NAS gateway at
  `http://host.docker.internal:8000` (`--add-host=host.docker.internal:host-gateway`), not to the hosted project.
- 2026-10-09: The image installs `curl`, because the Shopify crawler shells out to it. The first NAS full dry run failed with `spawn curl ENOENT`.
  The base is `node:24-trixie-slim`, because bookworm's curl 7.88 lacks the `--ca-native` flag the crawler passes.
- 2026-10-09: The retry backoff defaults to 5 min per attempt (`PRICE_HUB_RETRY_DELAY_MIN`), so 429 limits get time to reset.

## Documentation impact

- Classification: internal ops tooling; no production UI change.
- Public docs: none. Changelog: `chore(price-hub)` entries only.
