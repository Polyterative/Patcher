# Docs Screenshot Regeneration

Use this runbook when refreshing the product screenshots that may later be copied into the sibling `../Patcher-docs` GitBook repo.

## Credential-gated capture

Run:

```bash
pnpm test:e2e:screenshots
```

The script installs Chromium through the package pretest hook, then runs `scripts/ops/run-e2e-screenshots.mjs`. The runner loads `.env` the same way the E2E auth helper does. Product owner has approved the already-created, locally verified dedicated E2E account for these screenshot credentials; keep values only in local/secret storage and never print, document, or commit them. If `E2E_TEST_EMAIL` or `E2E_TEST_PASSWORD` is missing, it prints a `[e2e-screenshots]` skip message, exits 0, and leaves `src/assets/screenshots/major-area-screenshots/` untouched.

Only when credentials are present does the runner remove/recreate `src/assets/screenshots/major-area-screenshots/` and invoke Playwright for `chromium-screenshots` against `e2e/screenshots/auth-major-area-screenshots.spec.ts`. The canonical capture set is desktop JPEG output for the 10 major surfaces in that directory. The external docs sync publishes the seven docs-facing surfaces: home, modules, patches, racks, user area, account, and public profile.

## Manual review gate

After a successful authenticated run, open every generated image in `src/assets/screenshots/major-area-screenshots/` before treating it as publishable. Check for empty states, stale fixture data, debug overlays, bad crop/framing, or visually outdated surfaces. Record approval or blockers in the active plan Decision log.

## Dry-run docs sync

Product-owner approval is recorded for local-only mutation of a clean sibling `../Patcher-docs` checkout during screenshot sync. To preview the current mapping before mutating files:

```bash
pnpm sync:docs-screenshots -- --dry-run
```

The sync script verifies `../Patcher-docs` exists, is its own clean git worktree, is on `main` by default, and has the expected `.gitbook/assets` folder. Use `PATCHER_DOCS_SCREENSHOTS_BRANCH=<branch>` only for an intentionally reviewed docs branch. It prints mapped source/target files plus unmapped assets. It never commits or pushes; pushing `../Patcher-docs` remains out of scope unless explicitly requested.

Canonical docs screenshots are the desktop JPEGs produced by the current E2E output. Mutating sync is allowed only after screenshot review and only against the guarded local checkout. The script writes stable `patcher-<area>.jpg` asset names in `../Patcher-docs/.gitbook/assets`; update markdown references in the docs repo when that naming changes. It never commits or pushes the docs repo.
