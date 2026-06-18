# Bug — Tag taxonomy: `Voice` group contains non-voice-character tags

## Status

`[x]` Completed. The approved data-only Supabase migration was applied and
production read-back confirmed `Voice` now contains only the approved
hypothetical instrument / sound tags; `Full Voice` and `VCO` are `Source`, and
`VCA` is `Utility`.

## User intent

> "Inside the voice category we should only have the ones regarding the kind of
> sound they make. I want a new revised categorisation proposed to me and I will
> manually approve it before making changes."

The user spotted that the `Voice` tag-type group on the live tag taxonomy
surface lists tags that mix two different semantic axes:

- **Voice character** (hypothetical instrument / sound tags): BASS, CLAP,
  HAT, KICK, LEAD, PAD, PERC, SNARE
- **Architecture / signal-chain role** (the kind of building block):
  Full Voice, VCA · 1, VCO

Per the user, only the first set belongs in `Voice`. The second set
(`Full Voice`, VCA, VCO) describes module architecture, not hypothetical
instrument / sound identity, and should move to a different functional group.

## Product / roadmap fit

- This is a direct follow-up to the just-completed "Tag taxonomy — split
  PURPOSE group into sub-groups" task (see
  [`done/tag-taxonomy-split-purpose-group-into-sub-groups.md`](./tag-taxonomy-split-purpose-group-into-sub-groups.md),
  archived 2026-06-18). That task resolved the flat-list scanability problem
  but, on first inspection, the chosen grouping does not match the user's
  mental model of `Voice`.
- Coherent tag taxonomy is foundational for: rack-balance analysis
  (`rack-balance-analysis.service.ts`), the tag proposer panel, the module
  browser tag filter, and any future "search modules by sound" surface
  ([`product/ROADMAP.md`](../../../product/ROADMAP.md)).
- Aligns with `internaldocs/product/PRINCIPLES.md`: clarity over cleverness,
  and a domain model that mirrors how synth users actually think about modules.

## Current system analysis

### What `Voice` currently contains (live, June 2026)

From the user-supplied screenshot of the tag taxonomy surface:

| Tag | Semantic axis (proposed) | Notes |
|---|---|---|
| BASS | voice character | sub-bass / bass voice |
| CLAP | voice character | drum voice |
| Full Voice | architecture | self-contained voice module |
| HAT | voice character | drum voice |
| KICK | voice character | drum voice |
| LEAD | voice character | melodic lead voice |
| PAD | voice character | sustained / chord voice |
| PERC | voice character | percussion voice |
| SNARE | voice character | drum voice |
| VCA · 1 | architecture | gain / level building block |
| VCO | architecture | oscillator building block |

### Why the mismatch happened

The prior split task ([`done/tag-taxonomy-split-purpose-group-into-sub-groups.md`](./tag-taxonomy-split-purpose-group-into-sub-groups.md))
defined `type = 3 (Voice)` as `Full Voice, VCA, VCO` and only migrated tags
that were previously in `type = 0 (purpose)`. The drum/character tags
(BASS, CLAP, HAT, KICK, LEAD, PAD, PERC, SNARE) almost certainly already
carried `type = 3` in production from earlier seed/edit history, and were
**not** touched by either migration:

- [`20260618105927_split_purpose_tag_groups.sql`](../../../../supabase/migrations/20260618105927_split_purpose_tag_groups.sql)
- [`20260618121100_correct_split_purpose_tag_groups.sql`](../../../../supabase/migrations/20260618121100_correct_split_purpose_tag_groups.sql)
- [`20260618190400_correct_voice_tag_taxonomy.sql`](../../../../supabase/migrations/20260618190400_correct_voice_tag_taxonomy.sql)

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
| [`src/app/models/tag.ts`](../../../../src/app/models/tag.ts) | `TagType` enum, `TAG_TYPE_LABELS`, `TAG_TYPE_DISPLAY_ORDER`, `FUNCTIONAL_TAG_TYPES`, `NUMERIC_TAG_TYPE_NAMES` |
| `src/app/components/module-parts/module-minimal/module-tags/module-tags.component.html` | Tag proposer panel — groups dynamically by `type` label |
| `src/app/components/module-parts/module-minimal/module-tags/order-tags-by-type.pipe.ts` | Display ordering by `TAG_TYPE_DISPLAY_ORDER` |
| `src/app/features/rack-balance/rack-balance-analysis.service.ts` | `isBalanceRelevantTagType`, `getPatternsForTagType` — must understand any new group ID |
| `src/app/features/module-browser/module-browser-data.service.ts` | Tag filter behavior over typed groups |
| `supabase/migrations/` | Where any approved data correction lives as a new dated migration |

The grouping UI is data-driven, so once the DB rows carry the right `type`,
the surface re-groups automatically. **No app code change is required to fix
the categorization itself**, only if a brand-new `TagType` value is introduced.

### Read-only production read-back (2026-06-18T18:55+02:00 loop)

Source: Supabase MCP read-only `SELECT` against production project
`sozmatmywjpstwidzlss` (`Patcher`). Query covered every row currently in
`type IN (1, 2, 3)` plus VCA/VCO/VCF/LPG/EQ/Noise and the screenshot voice
tags wherever they live. No writes, migrations, RLS changes, or tag data
mutations were performed.

| Tag | Current type | Read-back note |
|---|---|---|
| Analog | `1` / Nature | Current Nature member. |
| Digital | `1` / Nature | Current Nature member. |
| Expansion | `1` / Nature | Current Nature member. |
| Expression | `1` / Nature | Current Nature member. |
| External | `1` / Nature | Current Nature member. |
| Hybrid | `1` / Nature | Current Nature member. |
| MIDI | `1` / Nature | Current Nature member. |
| Open Source | `1` / Nature | Current Nature member. |
| Passive | `1` / Nature | Current Nature member. |
| Power | `1` / Nature | Current Nature member. |
| PreAmp | `1` / Nature | Current Nature member. |
| Tube | `1` / Nature | Current Nature member. |
| Tuner | `1` / Nature | Current Nature member. |
| USB | `1` / Nature | Current Nature member. |
| Video | `1` / Nature | Current Nature member. |
| Aggressive | `2` / Character | Current Character member. |
| Atmosferic | `2` / Character | Current Character member; spelling preserved. |
| Cinematic | `2` / Character | Current Character member. |
| Creative | `2` / Character | Current Character member. |
| Dark | `2` / Character | Current Character member. |
| Destructive | `2` / Character | Current Character member. |
| Esoteric | `2` / Character | Current Character member. |
| Experimental | `2` / Character | Current Character member. |
| Liquid | `2` / Character | Current Character member. |
| Organic | `2` / Character | Current Character member. |
| Utilitarian | `2` / Character | Current Character member. |
| Vintage | `2` / Character | Current Character member. |
| Warm | `2` / Character | Current Character member. |
| BASS | `3` / Voice | Voice member from screenshot. |
| CLAP | `3` / Voice | Voice member from screenshot. |
| Full Voice | `3` / Voice | Voice member from prior split migration. |
| HAT | `3` / Voice | Voice member from screenshot. |
| KICK | `3` / Voice | Voice member from screenshot. |
| LEAD | `3` / Voice | Voice member from screenshot. |
| PAD | `3` / Voice | Voice member from screenshot. |
| PERC | `3` / Voice | Voice member from screenshot. |
| SNARE | `3` / Voice | Voice member from screenshot. |
| VCA | `3` / Voice | Architecture tag currently misgrouped under Voice. |
| VCO | `3` / Voice | Architecture tag currently misgrouped under Voice. |
| Noise | `4` / Source | Neighbouring source/building-block evidence. |
| EQ | `5` / Filter | Neighbouring functional evidence. |
| LPG | `5` / Filter | Neighbouring functional evidence. |
| VCF | `5` / Filter | Neighbouring architecture/filter evidence. |

Read-back resolved the unknowns:

- `Voice` contains exactly the screenshot set: BASS, CLAP, Full Voice, HAT,
  KICK, LEAD, PAD, PERC, SNARE, VCA, VCO.
- `Nature` and `Character` do not currently contain overlapping drum/voice
  identity tags.
- `VCA · 1` in the UI corresponds to the canonical `VCA` row (`id = 2`) plus a
  usage-count badge; there is no separate `VCA · 1` tag row in the read-back.

## Revised categorization proposal (approved for handoff)

Proposal summary: keep the existing `Voice` group as the hypothetical
instrument / sound group, move architectural/building-block outliers out of it,
and avoid introducing a new `TagType` enum value. This means no app-code change
is proposed for this phase; the approved handoff is a data-only `tags.type`
migration draft touching `Full Voice`, `VCA`, and `VCO` only.

| Tag | Current type → proposed type | Rationale |
|---|---|---|
| Analog | Nature → Nature | Describes module implementation nature, not sonic voice identity. |
| Digital | Nature → Nature | Describes implementation nature, not sonic voice identity. |
| Expansion | Nature → Nature | Describes module relationship/form factor, not a sound made. |
| Expression | Nature → Nature | Describes control/interface nature, not a sound made. |
| External | Nature → Nature | Describes external integration, not a sound made. |
| Hybrid | Nature → Nature | Describes mixed implementation nature, not sonic identity. |
| MIDI | Nature → Nature | Describes control protocol nature, not sonic identity. |
| Open Source | Nature → Nature | Describes product/source nature, not module sound. |
| Passive | Nature → Nature | Describes electrical nature, not module sound. |
| Power | Nature → Nature | Describes power infrastructure, not module sound. |
| PreAmp | Nature → Nature | Current taxonomy treats it as nature; do not broaden this bug fix. |
| Tube | Nature → Nature | Describes implementation/material character, not a voice category. |
| Tuner | Nature → Nature | Current taxonomy treats it as nature; do not broaden this bug fix. |
| USB | Nature → Nature | Describes connectivity nature, not module sound. |
| Video | Nature → Nature | Describes signal/media domain, not audible voice identity. |
| Aggressive | Character → Character | Describes subjective sound/interaction character, not a voice class. |
| Atmosferic | Character → Character | Describes mood/character; spelling preserved and no rename proposed. |
| Cinematic | Character → Character | Describes aesthetic character, not a voice class. |
| Creative | Character → Character | Describes use/character, not a specific sound made. |
| Dark | Character → Character | Describes timbral mood, not a voice class. |
| Destructive | Character → Character | Describes processing/result character, not a voice class. |
| Esoteric | Character → Character | Describes module character, not a voice class. |
| Experimental | Character → Character | Describes usage/design character, not a voice class. |
| Liquid | Character → Character | Describes timbral character, not a voice class. |
| Organic | Character → Character | Describes timbral character, not a voice class. |
| Utilitarian | Character → Character | Describes practical character, not a voice class. |
| Vintage | Character → Character | Describes aesthetic/era character, not a voice class. |
| Warm | Character → Character | Describes timbral character, not a voice class. |
| BASS | Voice → Voice | Describes the kind of sound/voice the module makes. |
| CLAP | Voice → Voice | Describes a drum voice sound class. |
| Full Voice | Voice → Source | Describes a complete technical sound source/voice module, not a hypothetical instrument/sound category like KICK or PAD. |
| HAT | Voice → Voice | Describes a drum voice sound class. |
| KICK | Voice → Voice | Describes a drum voice sound class. |
| LEAD | Voice → Voice | Describes a melodic voice sound class. |
| PAD | Voice → Voice | Describes a sustained/chord voice sound class. |
| PERC | Voice → Voice | Describes a percussion voice sound class. |
| SNARE | Voice → Voice | Describes a drum voice sound class. |
| VCA | Voice → Utility | VCA is a gain/control building block, not a sound identity; `Utility` is the existing functional group for signal/control helpers such as Attenuate, Mix, Pan, Switch. |
| VCO | Voice → Source | VCO is an oscillator/source building block, not a voice identity; `Source` already contains `Noise`, the other source-generator tag from the split migration. |
| Noise | Source → Source | Already models a source-generator building block. |
| EQ | Filter → Filter | Already models a filtering/tone-shaping function. |
| LPG | Filter → Filter | Already models a filter/gate function in current taxonomy. |
| VCF | Filter → Filter | Already models a filter architecture/function. |

Approval gate notes:

- **Manual proposal and Supabase application approval captured.** On
  2026-06-18T19:04+02:00, the product owner approved the migration draft with
  one adjustment: move `Full Voice` out of `Voice` too, and clarified that
  permission to apply Supabase is granted for the executor.
- The approved migration updates only `Full Voice` and `VCO` to `type = 4`
  (`Source`) and `VCA` to `type = 9` (`Utility`), using
  `where type is distinct from <target>`.
- This approval authorizes Supabase application by the executor, but this
  assistant/session must not apply the migration directly.
- **No new group is proposed.** If product instead wants a dedicated
  `Architecture` or `Voice Character` group, that is a different proposal and
  would require `src/app/models/tag.ts` and rack-balance impact review.

## Future strategy

- Treat `Voice` strictly as a **sonic identity** axis (what the module
  *sounds like* when listened to alone).
- Treat VCO / VCA / similar as **architecture / building block** axis.
- Land the proposal as a clean, reviewable migration that only touches
  `tags.type` (no `name` rewrites, no row deletions), consistent with the
  prior split's no-name-rename rule.
- Decide once whether voice-character tags warrant their own dedicated
  group (e.g. "Voice Character" or "Drum Voice") or fit cleanly inside the
  existing `Voice` (renamed/clarified) and a separate destination for
  architecture/building-block tags.

## Goals

1. Read the actual production state of `tags.type` for every name appearing
   in the screenshot and any neighbouring groups (`Voice`, `Character`,
   `Nature`, plus VCA/VCO/VCF wherever they live).
2. Produce a written **revised categorization proposal table** — exactly one
   tag → group assignment per row, with a one-line rationale per row — and
   present it to the user for explicit manual approval.
3. Draft a single approved migration that updates only `tags.type` for
   `Full Voice`, `VCA`, and `VCO`, following the patterns in
   `20260618121100_correct_split_purpose_tag_groups.sql` (skip no-op rewrites
   via `where type is distinct from <target>`).
4. Hand the approved draft to the executor that will apply and verify it.

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
- A single new dated migration that contains only
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

- [`src/app/models/tag.ts`](../../../../src/app/models/tag.ts)
- [`supabase/migrations/20260618105927_split_purpose_tag_groups.sql`](../../../../supabase/migrations/20260618105927_split_purpose_tag_groups.sql)
- [`supabase/migrations/20260618121100_correct_split_purpose_tag_groups.sql`](../../../../supabase/migrations/20260618121100_correct_split_purpose_tag_groups.sql)
- [`supabase/migrations/20260618190400_correct_voice_tag_taxonomy.sql`](../../../../supabase/migrations/20260618190400_correct_voice_tag_taxonomy.sql)
- [`done/tag-taxonomy-split-purpose-group-into-sub-groups.md`](./tag-taxonomy-split-purpose-group-into-sub-groups.md)
- Live `public.tags` table (read-only via Supabase MCP).

Potential write targets (only after explicit approval):

- New approved data-only migration: `supabase/migrations/20260618190400_correct_voice_tag_taxonomy.sql`.
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
   proposal contains *only* hypothetical instrument / sound tags, and
   explicitly excludes Full Voice, VCA, VCO, and similar architectural tags.
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
   only the approved voice-character set; Full Voice, VCA, and VCO appear in
   their new groups.

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
  [`patcher-ui-debug` skill](../../../../.github/skills/patcher-ui-debug/SKILL.md)
  and visually confirm group contents match the approved table.
- **Lint:** `pnpm lint`. **Docs check:** `node scripts/checks/check-docs.cjs`
  on this plan only (no app-code changes during the proposal phase).

## Risks and open questions

- **Risk: balance-analysis drift.** Moving Full Voice/VCA/VCO out of `Voice` may shift
  `rack-balance-analysis.service.ts` scoring for many existing racks. The
  proposal must explicitly call out which functional groups VCA/VCO end up
  in and whether scoring patterns need adjustment.
- **Risk: hidden tags.** The screenshot is not exhaustive. There may be
  additional tags currently in `Voice` that the read-back will surface;
  the proposal must cover all of them, not just the screenshotted ones.
- **Decision: ambiguous name resolved.** "Full Voice" reads as architecture
  (a self-contained voice module), not a hypothetical instrument / sound tag;
  approved destination is `Source`.
- **Open question: dedicated drum-voice group?** Should
  BASS/KICK/SNARE/HAT/CLAP/PERC be split out as their own group separate
  from melodic-voice tags (LEAD/PAD), or kept together inside `Voice`?
- **Decision: where do Full Voice/VCA/VCO go?** Use existing functional groups:
  `Source` for Full Voice and VCO, `Utility` for VCA. No new `Architecture`
  group in this pass.
- **Open question: backfill of the four missing Modulation names.** Out of
  scope here, but the read-back may surface them; flag and defer.

## Coordinator-loop handoff

When `coordinator-loop` selects this task it must:

1. Treat the work as **proposal-first**: do not draft any migration or
   touch `tags.type` until the proposal is approved in `Decision log`.
2. Use Supabase MCP only in read-only mode for the read-back step.
3. Approval has been captured for the proposal, migration draft handoff, and
   Supabase application by the executor:
   - move `Full Voice` and `VCO` to `Source`,
   - move `VCA` to `Utility`.
4. The delegated executor applied the approved migration and verified the production read-back.
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
- 2026-06-18T18:55+02:00 — Executor completed the proposal/read-only phase via
  Supabase MCP production `SELECT` on project `sozmatmywjpstwidzlss`
  (`Patcher`). Proposal: keep BASS, CLAP, Full Voice, HAT, KICK, LEAD, PAD,
  PERC, SNARE in `Voice`; move `VCA` from `Voice` to `Utility`; move `VCO`
  from `Voice` to `Source`; leave `Nature`, `Character`, `Noise`, `EQ`, `LPG`,
  and `VCF` unchanged. No migration was drafted or applied; manual proposal
  approval remains required before any migration draft.
- 2026-06-18T19:04+02:00 — Product owner clarified that `Voice` should contain
  only hypothetical instrument / sound tags, not technical module-role tags,
  approved a local migration draft for handoff, and granted permission for the
  executor to apply the Supabase mutation. Approved destination changes:
  `Full Voice` and `VCO` from `Voice` to `Source`; `VCA` from `Voice` to
  `Utility`. This session must not apply the Supabase mutation directly.
- 2026-06-18T19:08+02:00 — Product owner confirmed that if the executor follows
  these instructions and read-back verification confirms the approved grouping,
  the task is considered closed. Approved post-verification workflow cleanup:
  move the TODO entry to `COMPLETED.md`, archive this plan under `plans/done/`,
  and stage the next actionable task in `CURRENT_FEATURE.md`.

- 2026-06-18T19:17+02:00 — Delegated executor applied the approved data-only Supabase migration `correct_voice_tag_taxonomy` (no RLS or policy changes). Production read-back confirmed `BASS`, `CLAP`, `HAT`, `KICK`, `LEAD`, `PAD`, `PERC`, and `SNARE` remain `Voice` (`type = 3`); `Full Voice` and `VCO` are now `Source` (`type = 4`); `VCA` is now `Utility` (`type = 9`).
