# Docs Screenshot Pipeline Repair

Status: Active
Started: 2026-07-23

## Goal

Repair the in-repo Patcher docs screenshot pipeline so the seven docs-facing captures are deterministic, production-like, sanitised, manually reviewed, and dry-run synced without touching `../Patcher-docs` or mutating backend/account data.

## Layers

### Layer 1 — MVP

- [x] Add production screenshot Playwright config on port 5557.
- [x] Regenerate and assert production feature values in the runner.
- [x] Apply universal capture-time docs sanitisation.
- [x] Fix docs sync mapping to use `05-patch-details.jpg` for `patcher-patches.jpg`.

### Layer 2 — Structural

- [x] Add stable `--target=<id>` runner selection with one-worker default.
- [x] Tighten modules, racks, patches, and user-area readiness/filtering.
- [x] Pick an existing rich owned patch read-only, or block explicitly.
- [x] Capture public profile unauthenticated.

### Layer 3 — Polish

- [x] Add targeted invariant/sanitisation tests.
- [x] Update `internaldocs/testing/DOCS_SCREENSHOTS.md`.
- [ ] Capture and inspect the seven docs-facing outputs.
- [ ] Run full all-10 screenshot regression, final image review, and sync dry-run.
- [ ] Archive completion docs.

## Decision log

- 2026-07-23 — D1: Added `playwright.screenshots.config.ts` so screenshot runs boot Angular with production configuration on port 5557, never reuse a pre-existing server, and recreate auth storage state against the screenshot base URL.
- 2026-07-23 — D2: Replaced account-only redaction with universal capture sanitisation that rewrites E2E account identifiers and hides `[E2E]` fixture cards in approved screenshot containers before every JPG write.
- 2026-07-23 — D3: Changed docs sync mapping from `04-patches.jpg -> patcher-patches.jpg` to `05-patch-details.jpg -> patcher-patches.jpg`; `04-patches.jpg` remains a regression capture only.
- 2026-07-23 — D4: Set `10-public-profile.jpg` to unauthenticated capture context so docs-facing public profile screenshots show guest actions rather than the E2E badge.
- 2026-07-23 — D5: Initially added filename-based `--file=<basename>.jpg` selection from rev 2, then superseded it with R1's registry-backed `--target=<id>` selector. Target ids translate through `e2e/screenshots/targets.registry.*` to anchored `captures <target.title>` selectors and per-target output/blocked-marker cleanup.
- 2026-07-23 — D6: Removed screenshot spec parallel mode, added production nav guard, tightened browser readiness to real visible card counts, and added read-only rich patch selection based on existing owned patch connection/module counts.
- 2026-07-23 — D7: Manual review will use the in-session image-view path only. Observations below record nav, identity, content/framing, and verdict per required docs-facing output.
- 2026-07-23 — Validation: `node --test scripts/dev/sync-docs-screenshots.test.mjs e2e/screenshots/__tests__/sanitisation.test.mjs` passed. `E2E_TEST_EMAIL=dummy@example.invalid E2E_TEST_PASSWORD=dummy pnpm exec playwright test --config=playwright.screenshots.config.ts --project=chromium-screenshots --list` listed 10 capture targets plus the production nav guard. `pnpm lint` passed.
- 2026-07-23 — Blocker: This worktree has no `.env`, and inherited environment variables are missing `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`, and `SUPABASE_ANON_KEY`. Per AGENTS.md, these credentials must live only in the gitignored root `.env`; without them, the seven required captures cannot run and no image-view inspection can proceed. No backend data was read or mutated.
- 2026-07-23 — R1 adoption: Added typed/stable target registry, `--target=<id>` runner flow, automated 1:1 registry/title proof, `assertProductionShell(page)` for each publication gate, `.blocked/<id>.txt` evidence support, and R1's `docs-screenshot@patcher.xyz` / `Docs screenshot account` labels.
- 2026-07-23 — R1 validation: `node --test e2e/screenshots/__tests__/*.test.mjs scripts/dev/sync-docs-screenshots.test.mjs` passed 6/6. `node scripts/ops/run-e2e-screenshots.mjs --target=does-not-exist` failed before credential gating with `Unknown screenshot target "does-not-exist"`. `E2E_TEST_EMAIL=dummy@example.invalid E2E_TEST_PASSWORD=dummy pnpm exec playwright test --config=playwright.screenshots.config.ts --project=chromium-screenshots --list` listed 10 registry-titled captures plus the production nav guard. `pnpm test:e2e:screenshots -- --target=home` skipped safely due missing credentials. `pnpm lint` exited 0 with existing warnings.
- 2026-07-23 — Capture unblock: After credentials were populated, the first gate exposed two runner bugs before images could be produced: `generate-env.js` needed the repo's existing non-secret Patcher Supabase URL default when `.env` supplies only the anon key, and Playwright target selection needed config-owned `testMatch` plus `.*captures <title>$` grep because explicit file paths and fully anchored titles found zero tests.
- 2026-07-23 — Home gate hardening: Removed the home screenshot helper's production-incompatible `window.ng` component mutation/readiness path. The gate now waits on the production-rendered home hero `lib-graph` DOM and writes a blocked marker if the existing production default content cannot render a connected graph.

## Manual screenshot observations

- `01-home.jpg` (`home`) — nav: production header shows only Home, Modules, Racks, Patches, Manufacturers, with Home active and no Collections/Insights/Marketplace/Cool UI. Identity: unauthenticated shell shows Log in and Sign up; no E2E account identity is visible. Content/framing: 1920x1080 desktop crop cleanly frames the home hero, CTA buttons, rendered patch graph, and the top of the proof section; graph labels and demo patch content are readable without loading overlays. Verdict: pass.
