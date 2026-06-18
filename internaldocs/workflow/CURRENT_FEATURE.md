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

### Patch SVG previews

Plan: [`plans/patch-svg-previews.md`](./plans/patch-svg-previews.md)

Status: **No-schema utility slice completed / approval-gated.** The pure patch graph SVG renderer and co-located tests are in place. Schema, storage, Supabase calls, model `image` fields, UI components, and upload flows remain out of scope until explicit maintainer approval.

#### Why this is next

Docs screenshot refresh is gated on sanctioned credentials and approval for any external docs sync. Patch SVG previews has a safe independent foundation slice that reuses existing patch graph data/layout primitives without touching backend schema or real data.

#### Layer checklist

- [x] MVP foundation: render already-built patch graph nodes/edges into deterministic, XML-safe, self-contained SVG with targeted unit coverage.
- [ ] MVP backend/storage: blocked until schema/storage/RLS approval and preflight.
- [ ] Structural: patch preview component and list/detail embeds after backend shape is approved.
- [ ] Polish: visual tuning and design review after the preview surface exists.

#### Validation strategy

- Run `pnpm test-headless --include="**/patch-graph-svg.utils.spec.ts"` for the pure renderer slice.
- Run broader patch graph/unit coverage when later UI/data-service wiring is added.
- Run `pnpm lint` before any final checkpoint that includes docs and UI/backend changes.

#### Decision log

- 2026-06-18T20:18+02:00 — Selected the no-schema SVG renderer utility as the next autonomous slice because screenshot refresh is credential/approval gated, while this foundation is pure TypeScript with no storage, RLS, migration, Supabase, or real-data risk.
- 2026-06-18T20:23+02:00 — Renderer foundation is ready to commit after targeted tests, docs check, lint, and reviewer approval. Next implementation step is blocked on maintainer approval for the `patches.image` migration and `patches` storage bucket/RLS policy shape.
