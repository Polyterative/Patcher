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

### Contributor stats / contribution profile

**Goal:** Add a long-term, trust-first feature that shows how a user improves Patcher's shared data, especially the module catalogue, while keeping the product utility-first and explicitly non-social.

### Product boundaries

- contributor stats are **not** collection stats
- private dashboard phase first; public-safe subset later
- no leaderboards, likes, follows, streaks, or comparison mechanics
- public surfaces should prefer approved/public-safe contribution signals only
- backend instrumentation beyond current data is future-only for now

### Signals already available

- `modules.submitter`
- `modules.isApproved`
- `comments.authorId`
- `module_flags.user_id`

### Signals to keep out of scope for the first step

- collection size / owned modules
- profile views or other vanity metrics
- trust-tier badges before the trust model exists
- price-report stats before price reporting ships
- contributor rankings or public comparison

### Persona refinements

1. **New contributor:** needs clarity, reassurance, and low-friction empty states
2. **Steady contributor:** needs momentum and quality-oriented acknowledgement
3. **Power contributor / trust-builder:** needs durable proof of approved catalogue work
4. **Private / low-ego contributor:** needs private-by-default recognition without performative pressure

### Layer 1 — MVP

- [x] add a dedicated **Contributor stats** card in the user-area sidebar
- [x] reuse `app-statistics`
- [x] create a contributor-specific query/data layer instead of piggybacking on collection stats
- [x] initial private metrics:
  - [x] modules submitted
  - [x] approved modules
  - [x] pending modules
  - [x] comments posted
  - [x] module flags submitted
- [x] add empty/zero-state copy that nudges contribution without feeling game-like

### Layer 2 — Structural

- [x] add a public-safe subset on public profiles once privacy rules are settled
- [x] keep pending/private metrics owner-only
- consider a companion contribution activity surface using the shared `recent-activity` atom
- [x] keep the query layer ready for future trust-tier evolution

### Layer 3 — Polish

- [x] refine wording/tooltips/icon choices
- [x] mobile layout review
- [x] clearer distinction between approved/public contributions and in-review/private work
- [x] targeted tests for backend aggregation and stats-array mapping

### Likely implementation touchpoints

- `src/app/components/shared-atoms/statistics/`
- `src/app/features/routes/user-area/`
- `src/app/features/routes/public-profile/`
- `src/app/features/backend/supabase.service.ts`
- `src/app/features/backend/supabase-queries.ts`

### Future-only backend options (documented, not in this first step)

- approval audit trail / approval rate
- flag resolution attribution
- price-report contribution stats
- contribution timeline / trend snapshots
- edit-history stewardship metrics

---

## Notes

- Contributor stats should reuse shared UI surfaces before introducing any bespoke dashboard chrome.
- Public profile exposure should be explicit and narrow even after the private dashboard phase ships.
- Any future Supabase RLS/policy change still requires explicit manual user approval before implementation.
- Layer 1 now uses a dedicated contributor stats query that aggregates current-user module submissions, approvals, comments, and flags into one cached payload for the private dashboard.
- The shared `app-statistics` atom now supports an optional empty-state message so zero-value contributor stats still render guidance instead of disappearing.
- Layer 2 exposes only approved public modules on public profiles; pending modules, private review state, comments, and flags remain owner-only.
- Layer 3 wording now explicitly distinguishes private in-review work (`Pending review`) from public-safe approved catalogue work (`Approved public modules`).
