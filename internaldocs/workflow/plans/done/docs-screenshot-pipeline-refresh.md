# Docs Screenshot Pipeline Refresh

## Status

Completed 2026-06-18 — MEDIUM. Two-phase work (in-repo capture pipeline first, external docs sync second). Dedicated E2E account cleanup is now complete; canonical docs screenshots are the desktop JPEGs produced by the current E2E output, and product owner has approved using that already-created/locally verified dedicated E2E account for screenshot credentials. Product owner has approved local-only mutation of the sibling `../Patcher-docs` repo during guarded screenshot sync; pushing `../Patcher-docs` remains out of scope unless explicitly requested.

## User intent

The screenshots currently published in the external `Patcher-docs` GitBook (sibling repo `../Patcher-docs`) are stale and visually wrong relative to the live product. The user wants:

1. First, **trust the in-repo capture pipeline** — confirm our existing E2E screenshot specs actually produce good, current, representative images of each major surface, and fix the pipeline if they don't.
2. Then, **propagate** the validated images out to the documentation repo (one directory level up from this project), replacing the wrong assets that ship with the docs site.

The user explicitly does not remember whether the current end-to-end tests are capturing good data, so the plan must start with an audit before any docs change.

## Product / roadmap fit

- Documentation quality is a **public-facing surface** — outdated screenshots hurt onboarding, press / boilerplate (`the-project/high-res-official-images.md`), and the "what is Patcher" pitch.
- Adjacent backlog items already touch the screenshot machinery:
  - `e2e-dedicated-test-account-cleanup.md` (HIGH) — affects the data the auth screenshot specs see (modules / racks / patches owned by the test account).
  - `e2e-multi-instance-patching.md` (HIGH) — exercises the same auth E2E pipeline, so any pipeline reliability fix here compounds.
- No conflict with `ROADMAP.md` priorities; this is a quality / trust task that unblocks marketing and helps every later product launch ship with credible imagery.
- Should run **after** the dedicated test account cleanup task lands, because deterministic data is a prerequisite for reproducible screenshots — see "Dependencies and sequencing".

## Current system analysis

### In-repo capture surfaces (already exist)

- `e2e/screenshots/auth-major-area-screenshots.spec.ts`
  - Output: `src/assets/screenshots/major-area-screenshots/` (currently 8 jpgs: home, modules, module-details, patches, patch-details, racks, rack-details, user-area).
  - Targets defined as `SCREENSHOT_TARGETS` array, parallel mode, desktop viewport, reduced-motion, custom "ready" / "settle" hooks per target.
  - Uses fixed module id `1025` for module details and an "owned patch in edit mode" + "owned rack in edit mode" via auth helpers.
  - Home target is the only `authenticated: false` capture and pins a public connected patch via `setHomeHeroPatch`.
- `e2e/screenshots/auth-touch-target-tablet-review.spec.ts`, `auth-floating-surface-tablet-review.spec.ts`, `auth-rack-editor-touch-review.spec.ts`, `auth-form-ergonomics-tablet-review.spec.ts` — tablet review specs that emit ad-hoc PNGs (review artifacts, not docs assets).
- `e2e/screenshots/auth-predictable-rack.spec.ts`, `auth-predictable-patch.spec.ts` — write to `output/...` review folders, also not docs assets.
- `e2e/screenshots/cropper-debug.spec.ts` — debug-only.

### Package scripts

- `pnpm test:e2e:screenshots` — installs Chromium, loads `.env`, skips safely when E2E credentials are missing, and only after credentials are present wipes `src/assets/screenshots/major-area-screenshots/` before running **only** `auth-major-area-screenshots.spec.ts` on the `chromium-screenshots` project at 8 workers.
- Pretest hook `pretest:e2e:screenshots` installs Chromium only; guarded deletion/mkdir now happens inside `scripts/ops/run-e2e-screenshots.mjs` after auth credentials are confirmed.
- `scripts/dev/sync-docs-screenshots.mjs` previews the current in-repo → docs asset mapping and verifies the sibling docs worktree is clean/on the expected branch. Product-owner format approval is now settled on the checked-in desktop JPEG captures, but mutating sync into `../Patcher-docs` still needs separate explicit approval.

### Documentation repo (`../Patcher-docs`)

- GitBook repo, sibling to `Patcher`. Has its own `.git`.
- Image assets live in `.gitbook/assets/` (PNG). Currently 7 product PNGs use the `patcher-<area>-ipad-pro.png` naming, plus 3 `patcher-promo-*.png`.
- Used in:
  - `README.md` (home hero)
  - `learn-patcher.xyz/{patches,modules,racks,user-area,public-profiles,account-and-privacy}.md`
  - `the-project/high-res-official-images.md` ("Current product screenshots" + press boilerplate)
- File names are PNG and "iPad Pro" framed; in-repo specs currently produce desktop-viewport JPGs with different names (`01-home.jpg` …). Product owner chose the current E2E desktop JPEGs as canonical, so the docs side should migrate to that format/framing via an explicit mapping instead of adding a new iPad framing target.

### Gaps and risks observed

- **No coverage parity check:** the docs reference 7 screenshots; in-repo pipeline captures 8 (we have an extra `08-user-area`, missing `account-and-privacy`, missing `public-profiles`).
- **No determinism contract:** screenshots depend on the dedicated test account's data — if that account drifts, so do the images. The dedicated test account cleanup plan must land first or be sequenced together.
- **No visual diff / manual approval gate:** today the only signal a screenshot is "good" is whether the test passed; nothing flags a regressed layout, empty state, or content drift.
- **No sync mechanism to Patcher-docs:** copying is fully manual today.
- **Docs migration mismatch** between canonical in-repo desktop JPGs and existing docs "ipad-pro" PNG references.
- **Auth required for almost all targets** — the public-facing home is the only unauthenticated capture; everything else needs `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`. Any "regenerate docs" workflow must run somewhere those secrets are available.

## Future strategy

Two clean phases, designed so phase 1 is shippable on its own and phase 2 only runs once phase 1 is trusted.

### Phase 1 — Make the capture pipeline trustworthy

Goal: when a maintainer runs `pnpm test:e2e:screenshots`, they get a folder of images that are **objectively correct** and ready to publish.

- Audit each `SCREENSHOT_TARGETS` entry against the live product:
  - Confirm the prepared state still matches the real surface (e.g. module `1025` still exists, rack/patch edit-mode openers still target representative entities).
  - Confirm focus selectors still match the rendered DOM.
  - Confirm no stale / debug overlays leak into output.
- Decide and document the canonical "good capture" criteria (viewport, dpi, framing, light/dark, empty vs populated, what content to show).
- Add the missing surfaces the docs need but the spec doesn't cover (`account-and-privacy`, `public-profiles`).
- Use the approved desktop JPEG frame produced by the existing E2E capture output; update docs naming/markdown to match during the separately approved docs sync instead of maintaining two frame profiles.
- Add a manual-review checklist (developer opens `src/assets/screenshots/major-area-screenshots/` after a run and signs off in the plan's Decision log).

### Phase 2 — External docs sync

Goal: a low-risk, repeatable way to push validated images into `../Patcher-docs`.

- Add a script (under `scripts/dev/`) that:
  - Validates `../Patcher-docs` exists, is a clean git checkout on its expected branch, and is not the current repo.
  - Maps each in-repo capture filename to the docs asset path (mapping table lives next to the script).
  - Copies and reports a diff summary; never auto-commits in the docs repo.
- Update markdown references in `Patcher-docs` only when filenames change (one-time migration), keeping a stable naming scheme afterward so future syncs are pure file overwrites.
- Document the workflow in `internaldocs/testing/` (or wherever screenshot ops live) and in `Patcher-docs/the-project/high-res-official-images.md`.

## Goals

- A single command refreshes the canonical product screenshots from a known-good app state with deterministic data.
- Maintainers can trust those images enough to publish them without per-image manual editing.
- A second, explicit step copies the validated images to `../Patcher-docs` with a visible diff and no surprise commits in the docs repo.
- Docs repo stops shipping wrong / stale screenshots.

## Non-goals

- No new visual regression framework (Percy / Chromatic / `toMatchSnapshot` baselines).
- No automated PR-on-merge into `Patcher-docs` from CI.
- No iPad-Pro device frame rendering pipeline if we decide the desktop frame is enough.
- No reorganisation of `Patcher-docs` content structure.
- No replacement of promo art (`patcher-promo-*.png`) — those are designed assets, not app captures.

## Assumptions

- The dedicated test account has (or will have, after `e2e-dedicated-test-account-cleanup`) deterministic modules / racks / patches sufficient to render a credible screenshot for each surface.
- Maintainers running this workflow use the already-created, locally verified dedicated E2E account via `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` in local or secret storage; secret values must never be printed, documented, or committed.
- `../Patcher-docs` lives next to `Patcher` on every machine where the sync runs (consistent with current dev layout).
- Desktop viewport JPEG captures are the approved replacement for the existing "ipad-pro" framed PNGs; no separate framing sub-task is needed.

## Dependencies and sequencing

1. **Soft-blocked by** `e2e-dedicated-test-account-cleanup.md` — needed for deterministic capture content. Can start the audit (phase 1 step 1) before that lands but should not regenerate "official" images until it does.
2. Independent of `e2e-multi-instance-patching.md`, but both share the auth E2E harness — coordinate so the harness only changes once.
3. No code/runtime changes are needed in the app; this is test-infrastructure + docs work.

## MVP layer

- Audit `auth-major-area-screenshots.spec.ts` against the current product; list each broken/wrong target in the Decision log.
- Fix any prepare/focus selectors and module/patch/rack ids that no longer reflect the product.
- Confirm one full successful run of `pnpm test:e2e:screenshots` produces trustworthy artifacts.
- Manually copy the validated images into `../Patcher-docs/.gitbook/assets/` and open a docs PR — proves the round-trip end-to-end before automating.

## Structural layer

- Extend `SCREENSHOT_TARGETS` to cover every docs page that currently shows an iPad Pro screenshot (`account-and-privacy`, `public-profiles`, plus parity with existing ones).
- Settle the final stable JPEG naming (`NN-area.jpg` desktop versus docs-oriented `patcher-<area>.jpg`); update either the spec output or the docs markdown to match, exactly once.
- Add `scripts/dev/sync-docs-screenshots.mjs` that copies the validated set into `../Patcher-docs`, with safety checks (sibling exists, clean working tree, expected branch) and a printed diff. Never commits.
- Add a short ops doc (under `internaldocs/testing/` or `internaldocs/patterns/`) describing: when to regen, how to validate, how to sync, who reviews.

## Polish layer

- Surface a "screenshot freshness" line in the docs (e.g. "Last refreshed: <date>") sourced from a sidecar JSON written by the spec.
- Optional: add a lightweight "diff vs last run" summary (image hash + dimensions) for quick visual-drift signal without adopting a full snapshot tool.
- Optional: add a CI-only "smoke" job that runs the screenshot spec headless on a schedule and uploads artifacts (no docs PR), so drift is visible early.

## File / surface map

Repo paths likely to be touched (read-only during note-taking):

- `e2e/screenshots/auth-major-area-screenshots.spec.ts` — primary capture spec.
- `package.json` — `pretest:e2e:screenshots` / `test:e2e:screenshots` scripts; may grow a `sync:docs-screenshots` script.
- `playwright.config.ts` — has the `chromium-screenshots` project; may need viewport / project tweaks if framing changes.
- `src/assets/screenshots/major-area-screenshots/` — capture output dir; consider `.gitignore` posture if we choose not to commit them.
- `scripts/dev/` — new `sync-docs-screenshots.mjs` (phase 2).
- `internaldocs/testing/` or `internaldocs/patterns/` — new short ops doc.

External (sibling repo, separate git history — must not be auto-committed by this repo's tooling):

- `../Patcher-docs/.gitbook/assets/patcher-{home,modules,module-details,patches,patch-details,racks,rack-details,user-area,account,public-profile}-*.png|jpg`.
- `../Patcher-docs/README.md` and `../Patcher-docs/learn-patcher.xyz/*.md` — only if filenames change.
- `../Patcher-docs/the-project/high-res-official-images.md` — refresh "Current product screenshots" listing if names change.

## Acceptance criteria

- `pnpm test:e2e:screenshots` runs green and produces images for every surface that the docs reference.
- Each captured image has been visually reviewed by a maintainer; review is recorded in the Decision log of this plan (or its successor active plan once it goes in-flight).
- `Patcher-docs` no longer references missing or stale assets; every image embed in `learn-patcher.xyz/*.md`, `README.md`, and `the-project/high-res-official-images.md` resolves to a freshly captured image.
- A documented procedure exists for "I want to regenerate the docs screenshots" that any maintainer can follow in under 10 minutes (excluding test runtime).
- Sync into `../Patcher-docs` never auto-commits in that repo and prints a diff summary before changing files.

## Validation strategy

- Run `pnpm test:e2e:screenshots` locally with the dedicated test account; verify the 8+ images visually.
- Run `node scripts/checks/check-docs.cjs` after any in-repo doc additions.
- After phase 2: open `../Patcher-docs` locally, render the GitBook preview (or visually scan the markdown rendering on GitHub), and confirm pages show the new images.
- Spot-check `the-project/high-res-official-images.md` press boilerplate — these are the highest-trust surface for external sharing.

## Risks and open questions

- **Test account drift:** if the dedicated test account loses content, captures degrade silently. Sequencing answer: land `e2e-dedicated-test-account-cleanup` first.
- **Naming decision remains:** format/framing is settled on desktop JPEGs; before phase 2 mutates docs, choose whether to preserve the current `NN-area.jpg` names or migrate to docs-oriented `patcher-<area>.jpg` names.
- **External repo safety:** auto-pushing into `Patcher-docs` is out of scope, but even local copy needs guardrails to avoid clobbering uncommitted edits there.
- **Auth secrets in regen workflow:** product owner approved using the already-created, locally verified dedicated E2E account for screenshot credentials; running the auth pipeline outside a single maintainer's machine (e.g. CI) still requires normal secret storage/rotation and must never expose values.
- **Module / patch / rack id stability:** module `1025`, owned patch / rack lookups via helpers — confirm these will not change identity over time, or pin them via a fixture-managed identifier.
- **Open question:** should screenshots live in this repo (under `src/assets/screenshots/`) or only in `Patcher-docs`? Today they live in both implicitly. The plan recommends keeping them generated-but-gitignored here and committed only in `Patcher-docs`, but this needs a maintainer call.

## Approval queue

- **Credential gate: approved 2026-06-18T21:00+02:00.** Use the already-created and locally verified dedicated E2E account through the existing `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` local/secret mechanisms. Do not print, document, or commit the values.
- **External docs format gate: approved 2026-06-18T20:59+02:00.** Use desktop JPEGs as produced by the current E2E output; do not switch capture output to PNG or preserve the historical iPad-Pro framed PNG format.
- **Docs repo mutation gate:** after the format/framing decision, explicitly approve a local-only sync into a clean `../Patcher-docs` checkout; the script will not commit or push.

## Coordinator-loop handoff

When this plan is picked up by `coordinator-loop`:

- Treat phase 1 (audit + fixes inside `e2e/screenshots/auth-major-area-screenshots.spec.ts`) as the first verified-checkpoint chunk.
- Treat the new `scripts/dev/sync-docs-screenshots.mjs` plus its ops doc as a separate chunk.
- Do **not** let the loop edit anything under `../Patcher-docs` autonomously — that repo has its own review / publish workflow. The loop's responsibility ends at "validated images sit in `src/assets/screenshots/major-area-screenshots/` and the sync script reports a clean diff plan".
- Confirm the dependency on `e2e-dedicated-test-account-cleanup.md` before starting; if that plan is still open, pause and surface it.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-18 — Plan filed by feature-notetaker. Phase split (in-repo pipeline trust → external docs sync) chosen because the user explicitly flagged uncertainty about whether current E2E specs capture good data; sync should not run until that uncertainty is resolved.
- 2026-06-18T20:07+02:00 — Coordinator staged this next after dedicated E2E account cleanup because it is the smallest unblocked quality task, directly depends on the now-working auth E2E account, and can begin safely with an in-repo screenshot audit before any external docs sync.
- 2026-06-18T20:02+02:00 — Safe runner work completed without production changes: `pnpm test:e2e:screenshots` now loads `.env`, skips with `[e2e-screenshots]` when `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` are missing, and only deletes/recreates `src/assets/screenshots/major-area-screenshots` after credentials are present. The forced-empty credential validation preserved all 8 existing images.
- 2026-06-18T20:02+02:00 — Real screenshot capture/review remains queued because sanctioned local E2E credentials were unavailable. No visual audit approval was recorded and no selectors/data prep were changed.
- 2026-06-18T20:02+02:00 — Phase-2 sync tooling was added in dry-run-safe form only. Current source JPEGs map to existing docs PNG assets, so mutating sync is blocked until the maintainer approves final JPEG asset naming and external `../Patcher-docs` changes. GitHub Actions secret rotation remains blocked by current token permissions.
- 2026-06-18T20:59+02:00 — Product owner approved the canonical docs screenshot format as desktop JPEG exactly as produced by the current E2E output. This removes the PNG/iPad-Pro framing question; credentialed capture/visual review remains separately gated.
- 2026-06-18T20:59+02:00 — Product owner approved the docs screenshot pipeline to mutate the local sibling `../Patcher-docs` checkout during guarded screenshot sync. This approval is local-only: the sync must not commit or push `../Patcher-docs`, and pushing remains out of scope unless explicitly requested.
- 2026-06-18T21:00+02:00 — Product owner approved using the already-created and locally verified dedicated E2E account for Docs screenshot credentials via the existing local/secret mechanisms. Do not print or commit the credential values; visual review remains a separate approval gate.

- 2026-06-18T21:02+02:00 — Product owner resumed the approved gates. Authenticated desktop JPEG capture succeeded for 10 surfaces; account screenshot text was redacted before capture; local-only `../Patcher-docs` sync created stable JPEG assets and migrated markdown references without committing or pushing the docs repo. Visual review used the generated contact sheet and account preview.
