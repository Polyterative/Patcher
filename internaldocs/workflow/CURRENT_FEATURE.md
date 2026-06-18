# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut). Future agents read this to avoid relitigating settled questions.

---

## Active

### Docs screenshot pipeline refresh

Plan: [`plans/docs-screenshot-pipeline-refresh.md`](./plans/docs-screenshot-pipeline-refresh.md)

Status: **Partially advanced / gated.** A guarded screenshot runner now prevents credential-less runs from deleting existing images. The credentialless path was validated with empty E2E credential env vars; missing sanctioned local credentials still prevent real capture review. Do not edit or commit anything in `../Patcher-docs` autonomously.

#### Why this is next

The completed E2E cleanup unblocks authenticated screenshot reliability. Per user priority, this is smaller and safer than the remaining Marketplace/schema work, and the MVP can be limited to auditing/fixing in-repo screenshot captures before any external docs sync.

#### Layer checklist

- [ ] MVP: run/audit `pnpm test:e2e:screenshots`, inspect generated major-area images, and fix only in-repo capture selectors/data prep if outputs are stale or empty. Gated by a passing sanctioned credentialed run plus manual visual review.
- [ ] Structural: add missing docs-parity surfaces and a guarded sync script only after captures are trustworthy. Guarded dry-run sync exists, but mutating sync is blocked by JPEG → PNG format mismatch until maintainer approves naming/framing.
- [x] Polish: document the regenerate/review/sync procedure and record any manual visual approval gates.

#### Validation strategy

- Run `pnpm test:e2e:screenshots` with the dedicated auth account.
- Inspect generated images from `src/assets/screenshots/major-area-screenshots/` before treating them as publishable.
- Run `node scripts/checks/check-docs.cjs` after workflow/doc updates.

#### Decision log

- 2026-06-18T20:07+02:00 — Staged after E2E cleanup because the auth account dependency is now satisfied and the MVP is a bounded, no-schema, in-repo quality audit; external `Patcher-docs` changes remain out of scope without an explicit later sync step.
- 2026-06-18T20:02+02:00 — Added guarded screenshot runner so missing `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` skips safely without deleting `src/assets/screenshots/major-area-screenshots`; the forced-empty credential validation passed with the existing 8 images preserved.
- 2026-06-18T20:02+02:00 — Real screenshot capture/review remains queued because sanctioned local `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` values were unavailable; no selectors/data prep were changed without reviewed artifacts.
- 2026-06-18T20:02+02:00 — Added dry-run docs sync tooling and ops docs only; mutating `../Patcher-docs` changes still need maintainer approval, the JPEG-vs-PNG framing/naming decision, and clean external worktree confirmation. GitHub Actions secret rotation remains blocked by current token permissions.
