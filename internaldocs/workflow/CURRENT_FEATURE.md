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

No active feature.

Status: **No active feature.** Docs screenshot refresh is complete locally. Marketplace Purchase Price History strategic planning is drafted; implementation, migrations, policies, backend methods, and schema changes remain gated until the detailed plan is approved.

#### Why this is next

- Docs screenshot refresh completed local capture and local-only `../Patcher-docs` sync; do not push the docs repo unless explicitly requested.
- Patch SVG previews backend/storage direction is approved, but actual migrations/storage/RLS were not applied in this docs-only checkpoint.
- Marketplace Purchase Price History strategic plan is drafted for product-owner review; implementation, migration drafts, and applying migrations/RLS remain gated until that plan is approved.
- Cross-entity Cool reactions and Module I/O support require schema/RLS/data-model approval before implementation.

#### Layer checklist

- [x] Marketplace helper foundation committed-ready: deterministic integer-minor-unit money parsing/formatting helpers with targeted unit coverage.
- [x] Patch SVG previews backend/storage direction approval recorded.
- [x] Draft Marketplace Purchase Price History strategic plan in a separate checkpoint; do not draft/apply migrations or policies until the plan is approved.
- [ ] Select the next implementation task in a separate checkpoint.

#### Validation strategy

- Run the targeted helper spec for the pure money parsing/formatting slice before commit.
- Run `node scripts/checks/check-docs.cjs` for workflow documentation coherence.
- Run `pnpm lint` before any final checkpoint that includes code and docs changes.

#### Decision log

- 2026-06-18T20:28+02:00 — Parked Patch SVG previews on its explicit migration/storage/RLS approval gate and selected Purchase Price History's money-helper foundation as the next safe high-priority slice because it is pure TypeScript, testable, and avoids secrets, schema, RLS, external docs mutation, and real data.
- 2026-06-18T20:30+02:00 — Implemented import-safe marketplace money helpers for ISO currency normalization, integer minor-unit parsing, and Intl display formatting with targeted unit coverage; schema/RLS/backend work remains blocked on approval.
- 2026-06-18T20:34+02:00 — No further safe backlog implementation remains after the helper foundation: all remaining open candidates are approval-, credential-, external-docs-, dependency-, or schema/RLS-gated.
- 2026-06-18T20:58+02:00 — Product owner approved Patch SVG previews backend/storage direction (`patches.image`, dedicated `patches` bucket, owner-only writes, visibility-aligned reads, deterministic patch id/version filename); no migrations/storage/RLS were applied here.
- 2026-06-18T20:59+02:00 — Product owner chose the canonical docs screenshot format: desktop JPEG as produced by the current E2E output. This records format/framing approval only; no credentials are required and `../Patcher-docs` must not be mutated in this checkpoint.
- 2026-06-18T21:00+02:00 — Product owner approved Marketplace Purchase Price History detailed strategic planning for schema/RLS/currency/edit policy; do not draft/apply migrations, policies, backend methods, or schema changes until the plan is shown and separately approved.
- 2026-06-18T21:00+02:00 — Product owner approved the Docs screenshot pipeline to use the already-created and locally verified dedicated E2E account for screenshot credentials. Store/use the credentials only through existing local/secret mechanisms; do not print, document, or commit secret values. Visual review and docs repo mutation remain separate gates.
- 2026-06-18T21:02+02:00 — Completed Docs screenshot pipeline refresh: authenticated capture produced 10 desktop JPEGs, account screenshot text was redacted before capture, docs sync wrote seven stable JPEG assets into local `../Patcher-docs`, and old iPad-Pro PNG references were migrated locally without pushing.
- 2026-06-18T21:02+02:00 — Drafted the Marketplace Purchase Price History strategic plan covering schema strategy, owner-only RLS strategy, MVP currency policy, edit/delete policy, and the post-approval UI/API slice. No migrations, policies, backend methods, schema changes, or real data mutations were attempted.
