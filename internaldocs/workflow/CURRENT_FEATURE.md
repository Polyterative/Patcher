# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.

---

## Active

### Security — verify current public-profile privacy model

**Goal:** Determine what the repo currently enforces server-side for public profiles, public racks, and public patches so the privacy model is documented and any remaining gap is concrete.

### Product boundaries

- inspect and verify current behavior only; do not apply RLS/policy changes without explicit user approval
- trace both Supabase policy definitions and app-level query hardening
- leave the backlog clearer than it was found, whether the task resolves or becomes a documented follow-up

### Layer 1 — MVP

- [x] locate the active policy/query surfaces for `profiles`, `racks`, and `patches`
- [x] compare them against the intended public-profile privacy boundary
- [x] identify whether the remaining backlog item is resolved, stale, or still open

### Layer 2 — Structural

- [x] inspect current regression coverage around private-profile API access
- [~] capture the key enforcement points or remaining gap in workflow docs

### Layer 3 — Polish

- [ ] archive the result or rewrite the backlog item to match reality
- [x] only propose policy follow-up work if the investigation proves a real remaining gap

### Likely implementation touchpoints

- `supabase/migrations/*.sql`
- `src/app/features/backend/supabase-queries.ts`
- `src/app/features/backend/__tests__/supabase-service/get-complex-queries.spec.ts`
- `src/app/features/backend/__tests__/supabase-service/get-patches-filtering.spec.ts`

### Notes

- Finding: `profiles_select_own` currently uses `USING (true)` for authenticated reads, so the effective privacy boundary depends heavily on query-layer author-profile gating.
- Fixed in this slice: broad public listing queries (`GET.patches`, `GET.racksMinimal`) now inner-join `author_profile_gate` and filter to public profiles.
- Still needs a follow-up slice: shared by-ID rack/patch detail reads are reused by owner/private flows, so they need a more careful public/private split than the listing endpoints.
