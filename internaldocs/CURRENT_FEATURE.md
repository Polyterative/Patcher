# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file at the start of every session.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each layer before starting the next. Layout before interactions.

---

## Active: Module Details Page Redesign (Editor + Surrounding Context)

Goal: redesign the **whole Module Details page context** around the editor so contribution tasks are clearer, denser,
and more trustworthy without accidental destructive actions.

> **Pause note (2026-02-23):** previous feature **SEO Tagging & Rich Link Previews** has been moved to `TODO.md` under
> ON HOLD with completed/incomplete checkpoints preserved.

---

## 1) Broader Context Audit (Whole Page, not only CV rows)

Primary host template: `src/app/features/module-browser/module-browser-detail/module-browser-detail.component.html`

Current page zones:

- Left zone: module visual card + comments.
- Middle zone: data cards, search chips, and optional dev utils.
- Right zone: editor panel (when open), plus “Racked in” and “Patched in”.
- Bottom zone: “Others by manufacturer”.

Observed context-level UX pressure:

- Editor competes with multiple high-density side panels for attention and width.
- Contribution flow and read-only metadata are mixed in the same viewport without clear task mode framing.
- CV row controls inherit generic form widths; row-level interaction hierarchy is not explicitly modeled per task state.

---

## 2) Problem Statement and Scope

In-scope:

- Module editor section inside module details page.
- Surrounding layout and hierarchy that influences editor usability.
- Contribution-only interactions (add/edit/remove unsaved rows, save, undo, status comprehension).

Out-of-scope (for this redesign phase):

- Database schema changes.
- New moderation workflow.
- Edit FAB behavior changes (kept as-is in current iteration).

Current known pain points:

- Row composition is still visually imbalanced under constrained width.
- Form control sizing is not intentionally tuned by field type (name vs min/max voltage).
- New affordances need stronger visual rhythm with the page’s existing card system.
- The dedicated **“Review & save”** block is now redundant after introducing the floating save action, adding vertical noise without additional decision value.
- The current `Prepare` area still feels visually disjointed: `Power`, `Physical properties`, and `Panel` read as separate islands instead of one cohesive setup zone.
- Numbered wording (`1.`, `2.`) remains in parts of the UI despite no longer behaving like a strict wizard.
- Some copy still references previous structure and can be simplified for consistency with the FAB-based action model.

---

## 3) Target UX Model (Design Direction)

Design intent for redesigned Module Details editing:

- **Mode clarity:** clear distinction between browsing module info and actively editing contribution data.
- **Row hierarchy:** each CV row reads as `status/meta -> core fields -> action`, with consistent alignment.
- **Density with readability:** compact numeric controls, stable row height, no wasted horizontal space.
- **Safe affordances:** destructive language/color only for truly removable draft rows.
- **No accidental writes:** unsaved preview/testing remains first-class via dedicated no-save test paths.

Key components involved:

- `module-browser-detail.component.html` (page composition),
- `module-editor.component.*` (editor sections, save behavior),
- `module-editor-cv-form-line.component.*` (row ergonomics),
- `module-editor-adder-line.component.*` (preset entry point),
- supporting shared controls (`brand-primary-button`, chips, tooltips, snackbars).

---

## 4) Execution Plan (Three Layers)

### MVP Layer — Layout correction and task legibility

**Deliverable:** editor rows and section framing feel intentionally structured in the existing page.

Steps:

- [x] Rebalance editor row grid so status/meta, name, and voltage fields align on a clear baseline.
- [x] Normalize control widths by semantic type (name flexible; voltage compact).
- [x] Tune spacing between section headers, chips, adder line, and first row.
- [x] Gate: screenshot review on `/modules/details/1423` with unsaved draft rows.

### Structural Layer — Section architecture inside Module Details

**Deliverable:** editor sits in a clear contribution workflow that fits the broader page.

Steps:

- [x] Define explicit contribution sub-sections (“Prepare”, “Edit ports”, “Review & Save”).
- [x] Evaluate moving low-priority info (or collapsing it) while editor is open.
- [x] Introduce consistent content width strategy across right-side cards.
- [x] Gate: desktop and mobile screenshot diff shows improved visual hierarchy.
- [x] Redesign save model to avoid fragmented writes (from independent section saves to a clearer unified review/save flow).
- [x] Define data-handling rules for partial edits (draft state, dirty tracking, section validation, error recovery).
- [x] Add UX guardrails for save outcomes (single source-of-truth status, success/failure summary, retry behavior).

### Polish Layer — Interaction feedback and consistency

**Deliverable:** polished micro-interactions and consistent visual language.

Steps:

- [x] Refine status badge/iconography density and tooltip copy.
- [x] Harmonize new adder controls with brand button system (contrast, hover, focus).
- [x] Reposition the unified save action into a FAB-style affordance consistent with existing edit FAB placement and motion language.
- [x] Define FAB save states: idle (`Save`), dirty (`Save` emphasized), saving (`Saving...`/spinner), done (`Saved` short confirmation then idle).
- [x] Ensure FAB save does not overlap row controls on desktop/mobile (safe-area + bottom spacing + scroll-aware offset).
- [x] Remove the standalone “Review & save” section and replace it with compact inline policy copy near the editor
  header.
- [x] Validate keyboard and screen-reader semantics for row actions.
- [x] Validate keyboard and screen-reader semantics for the save FAB (focus order, label updates, disabled explanation).
- [ ] Gate: focused UX test pass + stakeholder signoff screenshots.

---

## 5) Reanalysis and Next Best Stage (2026-02-23)

Conclusion from latest iteration:

- The save action model is now correct (manual, explicit, unified), but the layout still communicates a 3-step wizard.
- Since save moved to FAB, step 3 does not carry unique interaction value and should be removed.
- Best next improvement is a **layout compaction pass** rather than more micro-styling.

Next-stage plan (layout reset, minimal-impact implementation):

1. **Collapse the workflow framing from 3 blocks to 2 blocks**
   - Keep: `Prepare` and `Edit ports`.
   - Remove: dedicated `Review & save` card.
   - Keep chips optional; if retained, update to 2 steps only.

2. **Introduce a compact editor action rail**
   - Place short helper copy near the top-right of editor body:
     - `Done` closes editor (primary mode toggle).
     - `Save` writes all pending changes (secondary FAB).
   - Avoid repeating safety copy in a dedicated full-width section.

3. **Move policy text to a low-footprint inline note**
   - Replace multi-line review block with one concise subtitle-level sentence.
   - Keep legal/safety meaning intact; reduce vertical height.

4. **Rebalance visual hierarchy within remaining blocks**
   - Give `Edit ports` more vertical priority and tighter top spacing.
   - Keep metadata prep visually lighter so row editing remains dominant.

5. **Validate with no-write flow and screenshot diff**
   - Re-run unsaved-draft Playwright scenario.
   - Confirm FAB pair spacing and non-overlap with row controls on desktop/mobile.

Success criteria for this stage:

- Editor feels shorter and denser without removing user confidence.
- Save remains manual and explicit.
- `Done` remains the primary close action, with `Save` clearly secondary and nearby.

---

## 6) Next Iteration Plan: Prepare + Panel Cohesion (2026-02-23)

Objective:

- Make the setup area feel like one coherent “module setup” zone, reduce leftover wizard language, and align copy with current behavior.

UX findings driving this iteration:

- The setup block currently has three independent mini-columns with weak shared hierarchy.
- `Panel` has different visual weight/structure than `Power` and `Physical`, which amplifies fragmentation.
- Step numbering is now unnecessary and increases cognitive overhead.
- Action guidance exists in multiple places; we need one clear, compact message.

Planned implementation (minimal-impact, structure-first):

1. **Remove step numbering language across editor copy**
   - Replace labels like `1. Prepare` / `2. Edit ports` with plain section titles (`Setup`, `Edit ports`).
   - Remove numeric chips or convert them to non-numeric role chips only if they still add value.

2. **Restructure Setup into a cohesive two-column composition**
   - Left: `Power` + `Physical` stacked as “Specs”.
   - Right: `Panel` as a dedicated upload/config card with matched heading rhythm.
   - Keep same controls and validation logic; layout-only change first.

3. **Unify helper copy and remove stale references**
   - Consolidate top note to one concise action line (`Done closes, Save writes pending changes`).
   - Remove references that imply the old step model.
   - Keep one safety/policy sentence in a predictable location.

4. **Improve visual linking between Setup and Edit ports**
   - Slightly reduce visual dominance of Setup backgrounds/borders.
   - Emphasize `Edit ports` as primary working area while preserving setup discoverability.

5. **Validation gates**
   - Run module editor unit tests.
   - Run Playwright UX screenshot suite (desktop/mobile/unsaved draft).
   - Verify no contradictory copy remains in `module-editor.component.*` and `module-browser-detail.component.html`.

Acceptance criteria:

- Setup reads as one connected section rather than three separate blocks.
- No numbered step language remains unless tied to real sequential behavior.
- Copy is consistent with current save model (manual FAB save + primary Done close).

Execution status (current pass):

- [x] Removed numbered step language from editor section titles and top flow framing.
- [x] Restructured setup layout into cohesive Specs + Panel composition.
- [x] Consolidated helper/policy copy and removed stale step references.
- [x] Rebalanced setup/edit visual hierarchy to keep `Edit ports` primary.
- [x] Completed title/label/copy cleanup sweep for practical, non-redundant wording.
- [ ] Capture stakeholder screenshot signoff for this cohesion pass.

---

## 7) Pause/Handoff Management and Validation

How this feature is being run while SEO is paused:

- Keep all redesign exploration in this file; keep backlog tracking in `TODO.md`.
- Preserve no-write verification path using Playwright unsaved-draft scenario.
- Commit in small checkpoints to allow easy rollback of individual layout experiments.

Validation checklist for each iteration:

- [x] Unit tests for module editor pass.
- [x] Playwright unsaved-draft snapshot test passes without save action.
- [x] Visual review confirms no white-on-white controls and no misleading destructive styling.
- [ ] `git status` contains only intended source/doc changes (no required artifacts).
