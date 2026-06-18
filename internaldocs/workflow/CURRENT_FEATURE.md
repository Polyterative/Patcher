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

Status: **Staged for next coordinator-loop.** Dedicated E2E test account cleanup is complete locally; start with an in-repo screenshot capture audit. Do not edit or commit anything in `../Patcher-docs` autonomously.

#### Why this is next

The completed E2E cleanup unblocks authenticated screenshot reliability. Per user priority, this is smaller and safer than the remaining Marketplace/schema work, and the MVP can be limited to auditing/fixing in-repo screenshot captures before any external docs sync.

#### Layer checklist

- [ ] MVP: run/audit `pnpm test:e2e:screenshots`, inspect generated major-area images, and fix only in-repo capture selectors/data prep if outputs are stale or empty.
- [ ] Structural: add missing docs-parity surfaces and a guarded sync script only after captures are trustworthy.
- [ ] Polish: document the regenerate/review/sync procedure and record any manual visual approval gates.

#### Validation strategy

- Run `pnpm test:e2e:screenshots` with the dedicated auth account.
- Inspect generated images from `src/assets/screenshots/major-area-screenshots/` before treating them as publishable.
- Run `node scripts/checks/check-docs.cjs` after workflow/doc updates.

#### Decision log

- 2026-06-18T20:07+02:00 — Staged after E2E cleanup because the auth account dependency is now satisfied and the MVP is a bounded, no-schema, in-repo quality audit; external `Patcher-docs` changes remain out of scope without an explicit later sync step.
