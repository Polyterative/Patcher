# User Area Cool List Preview Alignment

## Status

- [x] Completed 2026-07-08. User-approved `/user/area` Cool subsection structure and Cool button placement were screenshot-validated and polished; Rack Cool now delegates to the standard `app-rack-list` path. Patch Cool UI remains dormant until the parent Cool plan's schema/RLS and placement approval is granted.
- Priority: **MEDIUM**
- TODO section: **INFRA**
- Owner persona on pickup: `coordinator-loop` -> `designer` -> `frontend-dev` -> `reviewer`.

## User intent

The Cool filter in the User Area should not render a custom text-only list. Cooled modules, racks, and patches should use the same preview/list components as the rest of Patcher.

The current Cool implementation also mixes racks into the Modules section. That is the wrong information architecture: each User Area entity section should own its own personal/cool subsections. Modules get Owned / Wanted / For Sale / Cool. Racks get Personal / Cool. Patches get Personal / Cool.

There is a related visual issue in the module minimal card: the historical bottom action icons are acceptable and should remain visually unchanged. The problem is that the Cool button was inserted into that row, consumes too much space, and breaks the established action grammar. Cool needs a separate placement that does not disturb the normal mat-icon action row.

## Product / roadmap fit

This is a refinement of [Cross-entity Cool reactions](../module-cool-appreciation-button.md). It keeps Cool as a content-level curation feature, not a social feed, while making the user's personal Cool collection feel like part of the existing collection/rack browsing system.

It also supports the public-profile/community layer gate: user-area collection surfaces need to feel coherent before profile and marketplace work depends on them.

## Current system analysis

- `app-user-modules` renders Owned / Wanted / For Sale through `app-module-list`, which renders existing `app-module-minimal` preview cards.
- The Cool tab is projected into `app-user-modules` through `app-user-cool-collection`, but that projected surface currently includes both modules and racks.
- `app-user-cool-collection` currently renders custom `.user-cool-card` rows with hand-built title/meta/description markup and a stroked `Uncool` button.
- `UserCoolCollectionDataService` already loads cooled modules and racks separately and can keep the current optimistic remove / restore behavior.
- `app-module-list` already has a `moduleAction` / `moduleAction$` overlay pattern that can host a compact Uncool control without changing module preview internals.
- `app-rack-list` currently renders `app-rack-micro` rows and does not yet expose a matching `rackAction` input.
- `app-user-racks` currently has only the user's own rack list and no Personal / Cool subsection switch.
- `app-user-patches` currently has only the user's own patch list/tag filter and no Personal / Cool subsection switch.
- `app-module-minimal` historically renders normal mat-icon actions in a bottom row that is acceptable on `production`.
- Current development code inserts `app-cool-button` into that action row. This is the source of the visual break: Cool should not participate in the same footer layout as the normal module actions.
- Module, rack, and patch cards use similar preview-card patterns, so Cool needs a cross-card placement strategy that can work for all entity cards rather than a module-only footer fix.

## Future strategy

The Cool tab should become a per-entity preview surface, not a mixed custom card style. The durable direction is:

1. Modules section owns module-specific filters: Owned / Wanted / For Sale / Cool.
2. Racks section owns rack-specific filters: Personal / Cool.
3. Patches section owns patch-specific filters: Personal / Cool, after patch Cool support is approved.
4. Each Cool subsection uses the same preview/list component as its Personal subsection.
5. The only Cool-specific UI inside a Cool subsection preview row is a remove affordance placed in the same overlay system as the Cool control.
6. Detail/minimal card Cool controls should be outside the normal action footer, likely as an absolute overlay on the card/preview surface, so existing mat-icon actions remain exactly as they were.
7. The overlay position must be reusable across module, rack, and patch cards.

## Goals

- Replace custom cooled module/rack cards with existing preview/list components.
- Move rack Cool out of the Modules section and into the Racks section.
- Prepare the same pattern for Patches so patch Cool has its own Patch section subsection instead of being grouped under Modules.
- Preserve newest-first ordering inside each entity-specific Cool subsection.
- Preserve inline optimistic Uncool behavior with rollback on backend failure.
- Keep repeated rows free of full-weight Cool buttons; this tab already means "cooled".
- Preserve the production-style module minimal action row; remove Cool from that row.
- Find a reusable absolute/overlay Cool placement that works across module, rack, and patch card structures.
- Reduce bespoke Cool-list SCSS and align spacing, density, and responsive behavior with existing list surfaces.

## Non-goals

- No schema, migration, RLS, or Supabase policy changes.
- No patch Cool backend/schema support in this plan unless the already-blocked patch eligibility work is separately approved. The UI architecture should still reserve the Patch section pattern.
- No public discovery, homepage, or profile-surface Cool redesign.
- No root-level User Area Cool section.
- No mixed cross-entity Cool list inside Modules.
- No redesign of the normal module/rack/patch action icon rows. Those actions must remain visually and structurally familiar.

## Assumptions

- `UserCoolCollectionDataService` can be split or parameterized so each User Area section requests only the entity type it owns, without changing backend contracts.
- Modules can use the existing `app-module-list` action overlay.
- Racks either need a small `app-rack-list` action overlay added, or a deliberate fallback chosen during implementation.
- Patches will need a matching list-action pattern when patch Cool is approved.
- The preferred Cool placement is an absolute overlay attached to the card/preview container, not a footer participant.
- Existing Cool remove tests are still relevant and should be adapted, not discarded.

## Dependencies and sequencing

1. Preserve the current approved Cool subsection structure and button placement; do not redesign the placement unless screenshot validation reveals a concrete issue.
2. Capture screenshots and polish only clear alignment/spacing problems against the approved direction.
3. Keep Cool collection data outputs by entity type so Modules, Racks, and Patches can render their own Cool subsections independently.
4. Replace module custom rows first using `app-module-list`.
5. Remove rack rows from the Modules Cool tab.
6. Add Personal / Cool filtering to `app-user-racks`, add/select the rack remove-action pattern, then render cooled racks through the rack preview path.
7. Reserve the equivalent Personal / Cool patch-section pattern; implement only after patch Cool backend/placement approval.
8. Remove Cool from the module minimal footer and restore/preserve the production-style normal action row.
9. Remove obsolete custom card SCSS.
10. Update focused unit/layout tests and capture screenshots across breakpoints.

## MVP layer

- In the Modules section, render the Cool filter with `app-module-list`.
- Pass `showSearch=false`, preserve newest-first input order, and keep the parent section's scroll behavior coherent with `app-user-modules`.
- Configure the Cool/Uncool affordance as an absolute overlay action, not as a footer action.
- Wire `moduleAction$` to the existing `removeCool$` path.
- Remove rack data from the Modules Cool tab.
- Remove the top-level "N cooled items" summary; the active subsection and count are sufficient.
- Do not reopen the placement question unless screenshot validation shows a concrete conflict; user approval for the current sectioning/button placement is recorded.

## Structural layer

- Add Personal / Cool filtering to the Racks section. Personal is the user's own rack list; Cool is the user's cooled public rack list.
- Add a reusable card overlay action pattern to rack previews/list cards, then render the Racks Cool subsection through `app-rack-list`.
- Keep `app-rack-list` using the standard rack preview card path; do not create a second custom rack row.
- Add or plan Personal / Cool filtering for the Patches section. Personal is the user's own patch list; Cool is the user's cooled public patch list after patch Cool eligibility is approved.
- Add a patch card overlay action when patch Cool support lands, matching the module/rack overlay placement.
- Refactor `UserCoolCollectionDataService` into either entity-specific streams/services or a generic typed Cool collection service so each section owns only its own Cool data.
- Extract any common list-action config shape only if it avoids duplication without broad refactor risk.
- Keep action labels accessible: "Remove cool from <entity name>".

## Polish layer

- Replace bespoke empty group paragraphs with compact existing empty-state components.
- Ensure the Cool/Uncool overlay has enough contrast and touch target area but does not dominate the preview.
- Restore/preserve the normal module footer action row so the mat-icon actions look as they do on `production`.
- Place Cool in a card-level absolute overlay, visually separate from the regular action icons.
- Validate desktop, tablet, and mobile rhythm against Owned / Wanted / For Sale.
- Remove obsolete `.user-cool-card`, `.user-cool-list`, and summary-only styling.

## Designer suggestions

- The current custom rows feel like a different product because they bypass Patcher's established preview grammar.
- Do not group racks inside the Modules Cool tab. Cool is a subsection state per entity area, not a cross-entity bucket.
- Keep entity-specific section ownership: Modules / Racks / Patches each get their own Cool peer beside their personal content.
- Remove the top summary count and divider: they add chrome without new meaning once the section filter communicates context.
- Do not put `showCoolAction` or any Cool pill/button into the normal footer action rows.
- Use an absolute card overlay for Cool/Uncool with tooltip/ARIA copy, not an inline text button.
- Let `app-module-list` / `app-rack-list` inherit responsive tiling rather than adding new breakpoints.
- Treat the current `/user/area` sectioning and Cool button placement as approved; future frontend-dev work should validate and polish this direction instead of redesigning placement.
- The overlay should be evaluated against modules, racks, and patches before committing to it as a shared pattern.

## File / surface map

- `src/app/features/routes/user-area/user-cool-collection/user-cool-collection.component.html` — replace custom card template with module/rack list components.
- `src/app/features/routes/user-area/user-cool-collection/user-cool-collection.component.scss` — delete card-specific styles; keep only group/layout styles that remain necessary.
- `src/app/features/routes/user-area/user-cool-collection/user-cool-collection-data.service.ts` — expose typed module/rack list streams or helpers without changing backend access shape.
- `src/app/features/routes/user-area/user-cool-collection/user-cool-collection-data.service.spec.ts` — preserve load/group/remove/rollback coverage and add stream/action wiring cases.
- `src/app/features/routes/user-area/user-modules/user-modules.component.*` — Modules filter keeps Owned / Wanted / For Sale / Cool, but Cool renders modules only.
- `src/app/features/routes/user-area/user-racks/user-racks.component.*` — add Personal / Cool subsection filtering and render cooled racks here.
- `src/app/features/routes/user-area/user-patches/user-patches.component.*` — add or reserve Personal / Cool subsection filtering for patch Cool support.
- `src/app/components/rack-list/rack-list.component.ts` / `.html` / `.scss` — add rack action overlay if chosen.
- `src/app/components/patch-parts/*` or patch list/micro surfaces — add a matching action overlay only when patch Cool support is approved.
- `src/app/components/module-parts/module-minimal/module-minimal.component.html` / `.scss` — remove Cool from the footer action row and restore/preserve the production-style normal actions.
- Shared card/list overlay surface, exact file TBD during POC — provide a reusable Cool overlay placement for module, rack, and patch previews.
- `src/app/features/module-browser/module-list/module-list.component.*` — reference pattern only; avoid changes unless a tiny accessibility or config gap is discovered.
- `src/app/features/routes/user-area/__tests__/user-area-root.layout.spec.ts` — update if the Cool tab layout assertions depend on custom card markup.

## Acceptance criteria

- Modules Cool renders through `app-module-list` / `app-module-minimal`, visually matching Owned / Wanted / For Sale cards.
- Modules Cool contains modules only; no rack or patch rows appear in the Modules section.
- Racks section exposes Personal / Cool subsections; Rack Cool renders through the standard rack list/preview path, not a bespoke text card.
- Patches section has a planned or implemented Personal / Cool subsection pattern; patch rows are never grouped into Modules Cool.
- Each cooled item has exactly one Cool/Uncool overlay affordance with tooltip and ARIA label.
- Removing an item updates the list optimistically and restores only that item on backend failure.
- Each entity-specific Cool subsection preserves newest-first ordering and its own count/empty state.
- Empty module/rack groups use existing empty-state components.
- No `.user-cool-card` or `.user-cool-list` custom card styles remain.
- Repeated cards do not render Cool in the normal footer action row.
- `app-module-minimal` action buttons remain visually consistent with the current `production` footer actions.
- The current Cool sectioning/button placement is approved by the user and validated with screenshots before completion.
- The layout remains coherent at mobile portrait, tablet portrait, tablet landscape, desktop 1280px, and desktop 1920px.

## Validation strategy

- First validation milestone: capture screenshots of the approved current sectioning/button placement and fix only concrete polish/alignment issues.
- After approval, run focused user-area Cool collection unit tests.
- Run affected module-list/rack-list tests if rack action support is added.
- Run affected user-racks/user-patches tests when section filters are added.
- Run `pnpm lint`.
- Capture authenticated `/user/area` screenshots with Modules Cool, Racks Cool, and, when available, Patches Cool active before marking the visual work complete.

## Risks and open questions

- Existing list action overlays should remain unless screenshot validation shows a concrete conflict with panel imagery or card affordances.
- `app-rack-list` currently uses `app-rack-micro`; if that preview is too small compared with module previews, designer/frontend-dev should decide whether a separate standard rack preview configuration is needed.
- `app-module-list` action overlay currently uses a small shadow. If it feels too SaaS/noisy in the Cool tab, the Cool overlay should use its own shared treatment rather than regressing existing module actions.
- Absolute overlays can collide with module panel art, rack images, patch previews, badges, and mobile tap targets; validate the approved current placement against these risks before completion.
- Patch Cool remains blocked by the parent Cool plan's schema/RLS and placement approval. This plan may prepare UI structure but must not silently enable patch Cool backend behavior.
- Splitting Cool by entity section may require replacing the single mixed `app-user-cool-collection` component with typed per-section components. Prefer clarity over preserving the mixed abstraction.

## Coordinator-loop handoff

Pick this as a docs-backed UI refinement task. Preserve the current approved `/user/area` Cool subsection structure and current Cool button placement, then perform screenshot-backed validation/polish. The normal module action row should match the current `production` behavior, with Cool kept out of that footer. Prepare the patch section pattern only within the limits of the parent Cool plan. Do not touch backend schema/RLS. Keep production/release constraints from the parent Cool plan intact.

Run this work in the active/main checkout unless the user explicitly requests a separate worktree. The POC must be visible in the same dev server workflow the user is already using.

## Decision log

- 2026-06-20: User clarified that the UI mismatch is specifically the Cool list's custom module rows; desired direction is to use existing full preview components instead.
- 2026-06-20: Designer recommendation recorded: replace custom Cool cards with standard module/rack list previews, use compact Uncool overlays, remove redundant summary chrome, and keep grouped Modules/Racks structure.
- 2026-06-20: User refined the IA: Modules Cool must contain modules only. Racks and patches need their own section-level Personal / Cool subsections. User also flagged the module minimal footer as misaligned, with the Cool control taking too much space and using an undesirable design.
- 2026-06-20: User clarified the visual direction: Cool should not simply become smaller inside the footer. The existing mat-icon action rows should remain exactly as before, like `production`. Cool needs a separate absolute/overlay placement that can work across module, rack, and patch cards. Implementation must start with a proof of concept and ask for approval before continuing.
- 2026-06-20: User clarified workflow preference: do not use separate worktrees / child project sessions unless explicitly requested. POCs must be made visible in the active checkout/dev-server context by default.
- 2026-06-25T11:14+02:00 — Reconciled the plan against recent implementation commits: modules/racks now own separate Cool subsections and use existing preview paths, but the route-level Patch Cool tab was hidden again because patch reaction eligibility is still blocked by the parent Cool plan. The component/data scaffolding may remain dormant for future approved patch support, but the root user area must not call patch Cool backend paths before approval. Focused user-area Cool collection, modules, racks, and patches specs pass; visual screenshot approval is still pending on a running dev server.
- 2026-07-07T14:07+02:00 — User approved future loops to perform visual review and implement low-risk User Area Cool / Cross-entity Cool alignment polish on `develop`. Production release/push remains forbidden until explicitly requested.
- 2026-07-08T13:16+02:00 — Coordinator staged this as the next pipeline task after completing Rack Creator import preview polish. First executor must capture current `/user/area` screenshots and produce only a small placement POC until the Cool overlay/list alignment direction is approved.
- 2026-07-08T14:13+02:00 — User approved the current `/user/area` Cool subsection structure and current Cool button placement. Future loop work should not redesign the placement by default; it should capture screenshots, validate the approved direction, and polish concrete alignment/spacing issues only.

- 2026-07-08T15:20+02:00 — Completed screenshot-backed polish without changing approved placement: Modules/Racks/Patches section toggles remain as approved, Rack Cool now renders through `app-rack-list` instead of bespoke rack rows, focused specs/lint/docs passed, reviewer approved, and post-change authenticated screenshots showed no new console errors beyond existing dev warnings.
