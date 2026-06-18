# Docs Screenshot Regeneration

Use this runbook when refreshing the product screenshots that may later be copied into the sibling `../Patcher-docs` GitBook repo.

## Credential-gated capture

Run:

```bash
pnpm test:e2e:screenshots
```

The script installs Chromium through the package pretest hook, then runs `scripts/ops/run-e2e-screenshots.mjs`. The runner loads `.env` the same way the E2E auth helper does. If `E2E_TEST_EMAIL` or `E2E_TEST_PASSWORD` is missing, it prints a `[e2e-screenshots]` skip message, exits 0, and leaves `src/assets/screenshots/major-area-screenshots/` untouched.

Only when credentials are present does the runner remove/recreate `src/assets/screenshots/major-area-screenshots/` and invoke Playwright for `chromium-screenshots` against `e2e/screenshots/auth-major-area-screenshots.spec.ts`.

## Manual review gate

After a successful authenticated run, open every generated image in `src/assets/screenshots/major-area-screenshots/` before treating it as publishable. Check for empty states, stale fixture data, debug overlays, bad crop/framing, or visually outdated surfaces. Record approval or blockers in the active plan Decision log.

## Dry-run docs sync

Do not edit `../Patcher-docs` until the screenshots are reviewed and the maintainer has approved external docs changes. To preview the current mapping:

```bash
pnpm sync:docs-screenshots --dry-run
```

The sync script verifies `../Patcher-docs` exists, is its own clean git worktree, is on `main` by default, and has the expected `.gitbook/assets` folder. Use `PATCHER_DOCS_SCREENSHOTS_BRANCH=<branch>` only for an intentionally reviewed docs branch. It prints mapped source/target files plus unmapped assets. It never commits or pushes.

Current captures are JPEGs while the existing docs assets are PNGs, so a mutating sync is blocked until the maintainer settles the naming/framing/format decision or updates the capture outputs to match the docs assets.
