# Docs Screenshot Regeneration

Use this runbook when refreshing the product screenshots that may later be copied into the sibling `../Patcher-docs` GitBook repo.

## Credential-gated capture

Run:

```bash
pnpm test:e2e:screenshots
```

The script installs Chromium through the package pretest hook, then runs `scripts/ops/run-e2e-screenshots.mjs`. The runner loads `.env` the same way the E2E auth helper does. Product owner has approved the already-created, locally verified dedicated E2E account for these screenshot credentials; keep values only in local/secret storage and never print, document, or commit them. If `E2E_TEST_EMAIL` or `E2E_TEST_PASSWORD` is missing, it prints a `[e2e-screenshots]` skip message, exits 0, and leaves `src/assets/screenshots/major-area-screenshots/` untouched.

Only when credentials are present does the runner regenerate `src/environments/environment*.ts`, assert that production feature flags are safe for docs screenshots, and invoke Playwright with `playwright.screenshots.config.ts`. That config starts a production-mode Angular server on port 5557 and does not reuse an existing server, so dev-only navigation from port 5556 cannot leak into the captures.

For a full refresh, the runner removes/recreates `src/assets/screenshots/major-area-screenshots/` and captures the canonical desktop JPEG set for the 10 major surfaces. For a focused repair, use the stable file selector:

```bash
pnpm test:e2e:screenshots -- --file=01-home.jpg
```

`--file=<basename>.jpg` must match a known `SCREENSHOT_TARGETS` entry. Per-file mode deletes only that output and defaults to one worker; full mode defaults to eight workers. The capture test title format is `captures <fileName>`, and the runner translates `--file` to an anchored title selector.

Before every JPG write, the capture helper applies docs screenshot sanitisation in the browser: E2E account identifiers are rewritten to neutral docs-account text, UUID account IDs are redacted, and `[E2E]` fixture cards are hidden from the approved docs-facing containers. This is visual-only and must not create, rename, delete, or otherwise mutate backend data. If the remaining non-fixture content is insufficient, the screenshot is blocked and recorded in the active workflow plan Decision log.

The external docs sync publishes the seven docs-facing surfaces: home, modules, patch details, racks, user area, account, and public profile. The docs-facing patch asset maps from `05-patch-details.jpg`, not `04-patches.jpg`.

## Manual review gate

After a successful authenticated run, inspect images in-session with the image-view tool (`view` on the JPG path), not with macOS `open`, before treating them as publishable. The docs publication gate is exactly these seven files, in order:

1. `01-home.jpg`
2. `02-modules.jpg`
3. `05-patch-details.jpg`
4. `06-racks.jpg`
5. `08-user-area.jpg`
6. `09-account.jpg`
7. `10-public-profile.jpg`

For each gated file, record nav, identity, content/framing, and pass/blocked verdict in the active plan Decision log. `04-patches.jpg` is still generated during the all-10 regression, but it is not a docs publication gate.

## Dry-run docs sync

Product-owner approval is recorded for local-only mutation of a clean sibling `../Patcher-docs` checkout during screenshot sync. To preview the current mapping before mutating files:

```bash
pnpm sync:docs-screenshots -- --dry-run
```

The sync script verifies `../Patcher-docs` exists, is its own clean git worktree, is on `main` by default, and has the expected `.gitbook/assets` folder. Use `PATCHER_DOCS_SCREENSHOTS_BRANCH=<branch>` only for an intentionally reviewed docs branch. It prints mapped source/target files plus unmapped assets, including `05-patch-details.jpg -> patcher-patches.jpg`. It never commits or pushes; pushing `../Patcher-docs` remains out of scope unless explicitly requested.

Canonical docs screenshots are the desktop JPEGs produced by the current E2E output. Mutating sync is allowed only after screenshot review and only against the guarded local checkout. The script writes stable `patcher-<area>.jpg` asset names in `../Patcher-docs/.gitbook/assets`; update markdown references in the docs repo when that naming changes. It never commits or pushes the docs repo.
