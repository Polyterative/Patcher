# Bug — Tag taxonomy: `Voice` group contains non-voice-character tags

## Status

`[ ]` Backlog — proposal-only intake. No data, schema, or code changes until the
revised categorization is reviewed and **manually approved** by the product
owner per `AGENTS.md §5`.

## User intent

> "Inside the voice category we should only have the ones regarding the kind of
> sound they make. I want a new revised categorisation proposed to me and I will
> manually approve it before making changes."

The user spotted that the `Voice` tag-type group on the live tag taxonomy
surface lists tags that mix two different semantic axes:

- **Voice character** (the kind of sound the module makes): BASS, CLAP,
  Full Voice, HAT, KICK, LEAD, PAD, PERC, SNARE
- **Architecture / signal-chain role** (the kind of building block): VCA · 1, VCO

Per the user, only the first set belongs in `Voice`. The second set (VCA, VCO)
describes module architecture, not the sonic identity of a voice, and should
move to a different functional group.

## Product / roadmap fit

- This is a direct follow-up to the just-completed "Tag taxonomy — split
  PURPOSE group into sub-groups" task (see
  [`done/tag-taxonomy-split-purpose-group-into-sub-groups.md`](./done/tag-taxonomy-split-purpose-group-into-sub-groups.md),
  archived 2026-06-18). That task resolved the flat-list scanability problem
  but, on first inspection, the chosen grouping does not match the user's
  mental model of `Voice`.
- Coherent tag taxonomy is foundational for: rack-balance analysis
  (`rack-balance-analysis.service.ts`), the tag proposer panel, the module
  browser tag filter, and any future "search modules by sound" surface
  ([`product/ROADMAP.md`](../../product/ROADMAP.md)).
- Aligns with `internaldocs/product/PRINCIPLES.md`: clarity over cleverness,
  and a domain model that mirrors how synth users actually think about modules.

## Current system analysis

### What `Voice` currently contains (live, June 2026)

From the user-supplied screenshot of the tag taxonomy surface:

| Tag | Semantic axis (proposed) | Notes |
|---|---|---|
| BASS | voice character | sub-bass / bass voice |
| CLAP | voice character | drum voice |
| Full Voice | voice character | self-contained voice module |
| HAT | voice character | drum voice |
| KICK | voice character | drum voice |
| LEAD | voice character | melodic lead voice |
| PAD | voice character | sustained / chord voice |
| PERC | voice character | percussion voice |
| SNARE | voice character | drum voice |
| VCA · 1 | architecture | gain / level building block |
| VCO | architecture | oscillator building block |

### Why the mismatch happened

The prior split task ([`done/tag-taxonomy-split-purpose-group-into-sub-groups.md`](./done/tag-taxonomy-split-purpose-group-into-sub-groups.md))
defined `type = 3 (Voice)` as `Full Voice, VCA, VCO` and only migrated tags
that were previously in `type = 0 (purpose)`. The drum/character tags
(BASS, CLAP, HAT, KICK, LEAD, PAD, PERC, SNARE) almost certainly already
carried `type = 3` in production from earlier seed/edit history, and were
**not** touched by either migration:

- [`20260618105927_split_purpose_tag_groups.sql`](../../../supabase/migrations/20260618105927_split_purpose_tag_groups.sql)
- [`20260618121100_correct_split_purpose_tag_groups.sql`](../../../supabase/migrations/20260618121100_correct_split_purpose_tag_groups.sql)

Both migrations only `UPDATE` rows whose `name IN (...approved list...)` and
explicitly skip rows whose `type` already matches. So drum-voice tags stayed
in whatever group they had before, which happens to be `Voice`.

The corrective migration also reported four approved Modulation names
(`Clock Gen.`, `Env. Follow`, `Envelope Gen.`, `Uncertainty`) as absent from
production — those gaps are out of scope here but should be noted by the
implementing agent in case product wants to backfill.

### Code surfaces involved

| File | Role |
|---|---|
| [`src/app/models/tag.ts`](../../../src/app/models/tag.ts) | `TagType` enum, `TAG_TYPE_LABELS`, `TAG_TYPE_DISPLAY_ORDER`, `FUNCTIONAL_TAG_TYPES`, `NUMERIC_TAG_TYPE_NAMES` |
| `src/app/components/module-parts/module-minimal/module-tags/module-tags.component.html` | Tag proposer panel — groups dynamically by `type` label |
| `src/app/components/module-parts/module-minimal/module-tags/order-tags-by-type.pipe.ts` | Display ordering by `TAG_TYPE_DISPLAY_ORDER` |
| `src/app/features/rack-balance/rack-balance-analysis.service.ts` | `isBalanceRelevantTagType`, `getPatternsForTagType` — must understand any new group ID |
| `src/app/features/module-browser/module-browser-data.service.ts` | Tag filter behavior over typed groups |
| `supabase/migrations/` | Where any approved data correction lives as a new dated migration |

The grouping UI is data-driven, so once the DB rows carry the right `type`,
the surface re-groups automatically. **No app code change is required to fix
the categorization itself**, only if a brand-new `TagType` value is introduced.

### What is unknown until DB read-back

- Whether `Voice` contains additional tags beyond what the screenshot shows.
- Whether `Character` (`type = 2`) and `Nature` (`type = 1`) currently hold
  any tags that overlap semantically with the drum/voice character set.
- Whether VCA · 1 is a single canonical row or a duplicate alongside `VCA`.

The implementing agent must read these before drafting a proposal.

## Future strategy

- Treat `Voice` strictly as a **sonic identity** axis (what the module
  *sounds like* when listened to alone).
- Treat VCO / VCA / similar as **architecture / building block** axis.
- Land the proposal as a clean, reviewable migration that only touches
  `tags.type` (no `name` rewrites, no row deletions), consistent with the
  prior split's no-name-rename rule.
- Decide once whether voice-character tags warrant their own dedicated
  group (e.g. "Voice Character" or "Drum Voice") or fit cleanly inside the
  existing `Voice` (renamed/clarified) and a separate destination for VCA/VCO.

## Goals

1. Read the actual production state of `tags.type` for every name appearing
   in the screenshot and any neighbouring groups (`Voice`, `Character`,
   `Nature`, plus VCA/VCO/VCF wherever they live).
2. Produce a written **revised categorization proposal table** — exactly one
   tag → group assignment per row, with a one-line rationale per row — and
   present it to the user for explicit manual approval.
3. Once approved, draft (do not apply) a single new migration that updates
   only `tags.type` for the approved set, following the patterns in
   `20260618121100_correct_split_purpose_tag_groups.sql` (skip no-op rewrites
   via `where type is distinct from <target>`).
4. After explicit approval to apply, run the migration on production and
   verify the surface re-groups correctly.

## Non-goals

- No tag-name renames (preserve the prior "tag name strings must not be
  changed" rule).
- No new `TagType` enum value unless the proposal explicitly requires one and
  the user approves it.
- No restructuring of unrelated groups (Modulation, Effect, Sequencing,
  Utility, Filter, Source, Blank).
- No backfill of the four missing Modulation names noted in the prior plan.
- No UI redesign of the tag proposer or module browser filter.
- No commit autonomously triggered by the implementing agent before approval
  is captured in this plan's `Decision log`.

## Assumptions

- `tags.type` remains an integer column (no schema change needed).
- The grouping surface in the screenshot is the live tag-taxonomy/admin view
  driven directly by `tags.type` with labels from `TAG_TYPE_LABELS`.
- "VCA · 1" rendering is just the tag name `VCA` plus a usage-count badge,
  not a separate row.
- The product owner is the sole approver for tag-data mutations
  (`AGENTS.md §5`).

## Dependencies and sequencing

- **Hard dependency:** `done/tag-taxonomy-split-purpose-group-into-sub-groups.md`
  (already complete) — defines the current `TagType` enum surface this task
  builds on.
- **Soft dependency:** any in-flight work on rack-balance analysis or the
  module browser tag filter — re-categorization may shift balance scores if
  VCA/VCO move into a different functional group.

Sequence:

1. Read live data (read-only).
2. Draft proposal table.
3. Present proposal → wait for explicit user approval.
4. Draft migration SQL (do not apply).
5. Get explicit user approval to apply (`AGENTS.md §5`).
6. Apply migration.
7. Smoke-test rack-balance analysis and tag proposer.

## MVP layer

The minimum that resolves the user's reported bug:

- A read-back report covering every tag in the user-visible `Voice`,
  `Character`, and `Nature` groups, plus VCA/VCO/VCF and any architectural
  tag candidates.
- A proposal table with explicit destination `TagType` per tag and a
  one-line rationale per row.
- Explicit human approval recorded in this plan's `Decision log`.
- A single new dated migration (drafted, not applied) that contains only
  `UPDATE public.tags SET type = <id> WHERE type is distinct from <id> AND
  name IN (...)` statements.

## Structural layer

If the proposal calls for a new functional group (e.g. "Voice Character"
or "Drum Voice"):

- Add the new `TagType` enum value in `src/app/models/tag.ts` (next free
  integer, currently `11`).
- Add label to `TAG_TYPE_LABELS`.
- Insert into `TAG_TYPE_DISPLAY_ORDER` at a sensible position
  (likely adjacent to `Voice`).
- Decide whether the new type is functional for balance analysis
  (`FUNCTIONAL_TAG_TYPES`) and whether `isBalanceRelevantTagType` /
  `getPatternsForTagType` need updating.
- Run `pnpm updateBackendTypes` only if anything in the schema changes
  (the `tags.type` column type itself does not change).

If the proposal stays within existing `TagType` values, no app-code change
is required.

## Polish layer

- Update or add a tag-taxonomy unit test that pins the canonical
  group-membership for the affected tag names so future regroupings can't
  silently drift again. Suggested location: alongside
  `src/app/models/tag.spec.ts` or as a fixture-based test reading from a
  hard-coded golden table.
- Note the four missing Modulation names from the prior plan's read-back as
  a separate follow-up ticket if product still wants them.
- Optional: add a one-screen `internaldocs/` reference describing the
  current canonical tag taxonomy so the next agent has a single source of
  truth without grepping migrations.

## File / surface map

Read-only inspection (implementing agent must read):

- [`src/app/models/tag.ts`](../../../src/app/models/tag.ts)
- [`supabase/migrations/20260618105927_split_purpose_tag_groups.sql`](../../../supabase/migrations/20260618105927_split_purpose_tag_groups.sql)
- [`supabase/migrations/20260618121100_correct_split_purpose_tag_groups.sql`](../../../supabase/migrations/20260618121100_correct_split_purpose_tag_groups.sql)
- [`done/tag-taxonomy-split-purpose-group-into-sub-groups.md`](./done/tag-taxonomy-split-purpose-group-into-sub-groups.md)
- Live `public.tags` table (read-only via Supabase MCP).

Potential write targets (only after explicit approval):

- One new file under `supabase/migrations/<UTC>_revise_voice_tag_grouping.sql`.
- `src/app/models/tag.ts` only if a new `TagType` value is approved.
- `src/app/features/rack-balance/rack-balance-analysis.service.ts` only if
  the new group affects balance scoring.

## Acceptance criteria

1. **Read-back delivered:** the implementing agent posts a table of every
   tag currently in `type IN (1, 2, 3)` plus VCA/VCO/VCF wherever they live,
   sourced from production via the Supabase MCP read-only path.
2. **Proposal table delivered:** every tag from the read-back has exactly
   one proposed destination `TagType`, with a one-line rationale and a
   "current type → new type" delta column. The `Voice` group in the
   proposal contains *only* tags that describe sonic identity (kind of
   sound made), and explicitly excludes VCA, VCO, and similar architectural
   tags.
4. **Manual-approval gate cleared:** the product owner records explicit
   approval in this plan's `Decision log` (timestamp + decision text)
   before any migration is drafted as final.
5. **Migration drafted from approved table:** the new migration touches
   only `tags.type` for tags whose name appears in the approved table,
   uses `where type is distinct from <id>` to skip no-ops, and contains
   no name rewrites or deletions.
6. **Second approval gate cleared:** explicit user approval to apply the
   migration is captured in `Decision log` (`AGENTS.md §5`).
7. **Post-apply verification:** read-back confirms every tag landed on its
   approved `type`. Rack-balance analysis specs and tag-related component
   specs still pass via targeted `pnpm test-headless --include=...` runs.
8. **Surface check:** the `Voice` group in the live tag taxonomy view shows
   only the approved voice-character set; VCA, VCO appear in their new
   group.

## Validation strategy

- **Read-back:** Supabase MCP `execute_sql` with read-only `SELECT` over
  `public.tags` filtered by `type` and by relevant `name` lists. No writes.
- **Migration draft review:** diff the new migration against
  `20260618121100_correct_split_purpose_tag_groups.sql` to confirm structural
  similarity (same `UPDATE … where type is distinct from …` shape).
- **Targeted spec runs after apply** (do not run the full suite):
  - `pnpm test-headless --include="**/tag*.spec.ts"`
  - `pnpm test-headless --include="**/module-tags*.spec.ts"`
  - `pnpm test-headless --include="**/rack-balance*.spec.ts"`
- **Surface check:** open the tag taxonomy view (the surface in the user's
  screenshot) via `scripts/dev/agent-snapshot.mjs` per the
  [`patcher-ui-debug` skill](../../../.github/skills/patcher-ui-debug/SKILL.md)
  and visually confirm group contents match the approved table.
- **Lint:** `pnpm lint`. **Docs check:** `node scripts/checks/check-docs.cjs`
  on this plan only (no app-code changes during the proposal phase).

## Risks and open questions

- **Risk: balance-analysis drift.** Moving VCA/VCO out of `Voice` may shift
  `rack-balance-analysis.service.ts` scoring for many existing racks. The
  proposal must explicitly call out which functional groups VCA/VCO end up
  in and whether scoring patterns need adjustment.
- **Risk: hidden tags.** The screenshot is not exhaustive. There may be
  additional tags currently in `Voice` that the read-back will surface;
  the proposal must cover all of them, not just the screenshotted ones.
- **Risk: ambiguous names.** "Full Voice" sits on the boundary — it could
  read as architecture (a self-contained voice module) or as voice
  character (the sonic identity is "a complete voice"). The proposal must
  pick one and justify it.
- **Open question: dedicated drum-voice group?** Should
  BASS/KICK/SNARE/HAT/CLAP/PERC be split out as their own group separate
  from melodic-voice tags (LEAD/PAD), or kept together inside `Voice`?
- **Open question: where do VCA/VCO go?** Candidate destinations include
  an existing functional group (e.g. `Utility` for VCA, `Source` for VCO)
  or a new dedicated `Architecture` group. The proposal must pick one.
- **Open question: backfill of the four missing Modulation names.** Out of
  scope here, but the read-back may surface them; flag and defer.

## Coordinator-loop handoff

When `coordinator-loop` selects this task it must:

1. Treat the work as **proposal-first**: do not draft any migration or
   touch `tags.type` until the proposal is approved in `Decision log`.
2. Use Supabase MCP only in read-only mode for the read-back step.
3. Pause and request explicit user approval **twice**:
   - once to approve the proposal table,
   - once to approve applying the drafted migration (per `AGENTS.md §5`).
4. After both approvals, apply the migration, run targeted specs, run
   `pnpm lint`, and capture verification in `Decision log`.
5. Move this plan to `done/` and update `TODO.md` and `COMPLETED.md` only
   after surface check confirms the new grouping.
6. Do **not** commit any data-mutation work without explicit user approval
   in `Decision log`. Documentation-only checkpoint commits during the
   proposal phase are allowed if the user requests them.

## Decision log

- 2026-06-18T13:07+02:00 — Plan created by `feature-notetaker` from a user
  bug report. Source evidence: user-supplied screenshot of the tag
  taxonomy surface showing the `Voice` group containing BASS, CLAP, Full
  Voice, HAT, KICK, LEAD, PAD, PERC, SNARE, VCA · 1, VCO. User explicitly
  requested a proposed revised categorization with manual approval before
  any data change. No code, schema, or data was touched during intake.
