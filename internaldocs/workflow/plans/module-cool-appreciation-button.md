<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Cross-entity Cool reactions

## Status

- [~] Backend checkpoint, disabled-by-default shared UI/data-service checkpoint, and modules/public-racks surface wiring checkpoint are implemented locally. Approved Cool backend objects are applied on the linked Supabase project, but broader linked migration/typegen drift remains; the latest local typegen candidate was rejected as regressive, so production-visible Cool wiring stays gated off pending safe typegen/operational verification. User clarified that the feature must stay on `develop`, with no production branch/release/push and `coolReactionsEnabled` default-off.
- Priority: **LOW**
- TODO section: **INFRA**
- Owner persona on pickup: `coordinator-loop` → `planner` → `frontend-dev` after explicit schema/RLS approval.

**Why:** Users need a lightweight, expressive way to say "this is cool" about modules, racks, patches, and future content
objects. Cool is intentionally closer to how people actually talk than enterprise terms like "notable" or "appreciation".
It is separate from ownership intent: "I think this is cool" is not "I want to buy it", "I own it", or "I endorse the
author". It is both personal curation and a useful aggregate discovery signal.

**Product principle update:** Cool reactions are allowed. Patcher still should not become a generic social network with
follows, friend graphs, streaks, or profile leaderboards, but content-level reactions are in scope when they make the tool
more useful and more alive.

## Product concept

- A single-tap **Cool** button on eligible modules, racks, patches, and later other content objects.
- The interaction should be **delightful and uniquely Patcher**: immediate state change, satisfying press feedback, and a
  small tasteful burst/pop animation inspired by social likes without copying generic heart/thumb behavior.
- Togglable: tap once to cool, tap again to un-cool.
- Public aggregate count can be shown where it helps discovery.
- Personal state is private: other users can see that an entity is cool to the community, not exactly who cooled it.
- Users can review their own cooled items in a dedicated user-area surface, similar in spirit to owned/wanted/for-sale
  module collections.

## MVP / Structural / Polish layers

### MVP

- Modules and public racks are reactable.
- Signed-in users can toggle Cool.
- Anonymous users can see public counts where the surface already supports aggregate stats.
- User area gets a Cool collection view grouped by entity type.
- No homepage discovery section yet; keep the first slice focused on the core data path and interaction.

### Structural

- Add patches as a reactable entity.
- Add batch count reads for list/card surfaces.
- Add browser sort/filter support such as "Cool" or "Most cool" where it helps discovery.
- Make Cool available to reusable entity card/detail patterns instead of one-off module/rack wiring.

### Polish

- Add a homepage or browse-surface showcase for cool entities.
- Introduce a public-safe discovery RPC/materialized snapshot if live count sorting becomes expensive.
- Refine the tap animation and responsive touch behavior after screenshot review.

## Data model

Use a new polymorphic table rather than extending `user_modules.kind`.

Do **not** add `COOL` to the existing `HAS | WANTS | SELLS` module possession model. Cool must be additive: a user can own
a module and think it is cool at the same time. It also needs to work for racks and patches, which are not module
possession records.

Recommended tables:

- `reactions`
  - `user_id uuid`
  - `entity_type smallint` or equivalent shared enum value
  - `entity_id bigint`
  - `kind text default 'COOL'`
  - `created_at timestamptz default now()`
  - unique key on `(user_id, entity_type, entity_id, kind)`
- `reaction_counts`
  - `entity_type`
  - `entity_id`
  - `kind`
  - `total`
  - `updated_at`

Default behavior:

- One active Cool row per user/entity.
- `created_at` records when the user first cooled the entity.
- Un-cool deletes the row.
- If full press-by-press analytics are needed later, capture toggle events through the analytics pipeline instead of making
  the operational table append-only.

## Privacy and eligibility

- Public modules are reactable in the first backend checkpoint; non-public module rows are excluded to avoid exposing hidden IDs through aggregate counts.
- Racks and patches are reactable only when public.
- If a public rack/patch later becomes private, public discovery/count surfaces must stop exposing it.
- Users may cool their own public rack/patch unless product later decides otherwise.
- Public views show aggregate counts only; no "who cooled this" list in the initial feature.

**Requires explicit user approval** before any migration, RLS, policy, or SECURITY DEFINER RPC work.

## Approval queue

- **Approval requested 2026-06-19T09:21+02:00:** May the next implementation checkpoint draft and apply a narrow Cool reactions schema/RLS plan for a polymorphic `reactions` table plus aggregate `reaction_counts` support, limited initially to modules and public racks? Default if not approved: keep work planning/docs-only and do not create migrations, policies, RPCs, or generated type changes.
- **Approval recorded 2026-06-19T09:20+02:00:** User approved “as usual” only if the checkpoint is not a breaking change to the current production build. This authorizes additive/narrow work only: modules + public racks initially, no unrelated RLS/policy changes, and stop before any breaking change or risky production behavior.
- **Operational constraint recorded 2026-06-19T09:20+02:00:** Do not switch to `production`, release, push, or expose Cool frontend code. Keep `coolReactionsEnabled` default `false`. `pnpm updateBackendTypes` may be run only as a local candidate diff and must be reverted if it removes/regresses unrelated local schema/types.
- **Typegen blocker recorded 2026-06-19T10:57+02:00:** Linked-project typegen currently regresses unrelated local types (`user_module_acquisitions`, `reactions` FK relationship, DB-default `public_id` insert optionality). Keep `src/backend/database.types.ts` unchanged until the linked migration history is reconciled or the generated diff can be safely hand-corrected with explicit scope.

## Backend/service plan

- Read `internaldocs/patterns/BACKEND_METHODS.md` schema-change preflight before writing SQL.
- Register `reactions` and `reaction_counts` in `DatabaseStrings.ts`.
- Add generated Supabase types with `pnpm updateBackendTypes` only when the candidate diff is safe/non-regressive; this checkpoint uses manually maintained local types for `reactions` and `reaction_counts` because unrelated linked remote drift is still recorded.
- Do not wire production-visible UI to these methods until safe typegen/operational verification is complete, unless a disabled-by-default feature guard proves the UI makes no Cool backend calls while off.
- Add backend methods through `SupabaseService` only:
  - `add.reaction(entityType, entityId, kind = 'COOL')`
  - `delete.reaction(entityType, entityId, kind = 'COOL')`
  - `get.currentUserReactions(entityType?, kind = 'COOL')`
  - `get.reactionCount(entityType, entityId, kind = 'COOL')`
  - `get.reactionCountsForEntities(entityType, entityIds, kind = 'COOL')`
- Add cache keys for reaction state, reaction counts, current-user reactions, and future reaction discovery.
- Bust all reaction caches after add/delete.
- Avoid N+1 queries: list surfaces should batch counts and share the current user's reaction state.

## UI plan

- Create a shared Cool button component with component-scoped data service.
- Gate the first UI/data-service checkpoint behind a disabled-by-default feature flag; when disabled, the component must not query or mutate `reactions` / `reaction_counts`.
- Inputs should include entity type, entity id, public/eligible state, and count display mode.
- Shared `app-cool-button` and its component-scoped data service are available behind `environment.features.coolReactionsEnabled`; feature-off and ineligible paths render no button and do not call Cool backend methods.
- Module detail/list and rack detail/list surfaces now instantiate `app-cool-button` only when `coolReactionsEnabled` is true, pass module/rack `ReactionEntityTypes`, ids, public eligibility, and count display mode, and leave patches unwired for the structural layer.
- Components must not call `SupabaseService` directly.
- Button copy:
  - Off: "Cool"
  - On: "Cooled"
  - Tooltip/ARIA off: "Mark as cool"
  - Tooltip/ARIA on: "Remove cool"
- Icon direction: expressive but not generic. Evaluate Material icons such as `auto_awesome`, `flare`, `bolt`, or a custom
  in-system treatment if Material cannot carry the right character. Avoid thumbs-up; it is too generic.
- Cards: compact always-visible icon button; no hover-only affordance.
- Detail pages: larger action in the existing action area, with count if the surrounding stats pattern supports it.
- User area: add a Cool view grouped by Modules / Racks / Patches, newest first, with inline remove action and no
  confirmation dialog.

## Delight requirements

- Cool must feel satisfying, not administrative.
- State should flip immediately, then rollback on backend error with a snackbar.
- Press feedback should be short, functional, and characterful: burst/pop/radiating accent, under 150ms unless there is a
  strong reason.
- Respect `prefers-reduced-motion`.
- No decorative idle animation.
- Touch target must be large enough on mobile/tablet; never rely on hover.

## Discovery plan

- Use aggregate Cool counts to help users find interesting modules/racks/patches.
- Copy can be direct and human: "Cool modules", "Cool racks", "People think this is cool".
- Avoid profile leaderboards and creator-status rankings.
- Hide weak-signal discovery sections below a minimum threshold rather than showing fake precision.
- Public discovery must only include public-safe entities.

## Testing / validation

- Unit-test Cool button state, optimistic toggle, rollback, disabled/loading state, and ARIA state.
- Unit-test backend methods and cache busting.
- Unit-test user-area Cool grouping and newest-first ordering.
- Add auth E2E coverage: user A cools a module/rack, user B sees the aggregate count, user A sees it in Cool, un-cooling
  removes it.
- Run targeted `pnpm test-headless --include=...`, then `pnpm lint`.
- For visual polish, use the Patcher UI debug screenshot workflow before considering the interaction done.

## Acceptance criteria

- Signed-in users can optimistically toggle Cool on eligible modules and public racks, with rollback + snackbar on backend failure.
- Anonymous users can see aggregate Cool counts where the card/detail surface already shows public aggregate stats.
- User-area Cool collection groups cooled modules/racks (patches in the structural layer) newest-first and supports inline uncool.
- Private racks/patches never appear in public Cool discovery/count surfaces.
- Backend methods live behind `SupabaseService`, use explicit columns, and cache-bust all reaction state/count reads after writes.
- Relevant focused unit tests and `pnpm lint` pass before any verified checkpoint commit.

---

## Decision log

- 2026-06-17: Keep the product term **Cool**. Do not rename to "Notable"; the interaction should feel human, playful, and
  delightful while staying content-scoped rather than social-graph-driven.
- 2026-06-17: Supersede the old module-only enum idea. Cool needs a separate polymorphic reactions table so it remains
  additive to ownership/wishlist/sale state and can support racks, patches, and future entities.
- 2026-06-19T09:21+02:00 — Staged as the next safe coordinator-loop task after Patch SVG previews remained blocked by linked migration/typegen drift. Because Cool requires new schema/RLS/policy work, the active checkpoint is planning and an explicit approval gate only; no SQL, generated types, or backend code should be changed before approval.
- 2026-06-19T09:20+02:00 — User conditionally approved the next Cool reactions schema/RLS checkpoint only if it is non-breaking for the current production build. The approval is limited to additive/narrow support for a polymorphic `reactions` table plus aggregate `reaction_counts`, modules + public racks initially, with no unrelated RLS/policy changes; stop before any breaking change or risky production behavior.
- 2026-06-19T09:32+02:00 — Added local migration `20260619092800_add_cool_reactions.sql` creating only new Cool reaction objects: `reactions`, `reaction_counts`, helper/trigger functions, indexes, and RLS policies. Application access now goes through `SupabaseService` namespaces with explicit columns and reaction cache busting. Remote typegen was intentionally not run due to recorded linked Supabase drift; `src/backend/database.types.ts` was manually updated for the two new tables and validated with focused backend/static tests. Reviewer pass narrowed module eligibility to public modules, matching the production-safe aggregate-count exposure model already used for racks.
- 2026-06-19T09:43+02:00 — Reconciled the workflow docs after the local backend checkpoint. The next safe loop action can only be disabled-by-default shared UI/data-service wiring, with tests that prove the gate-off path performs no Cool backend reads/writes; otherwise UI remains blocked until remote migration/typegen reconciliation.
- 2026-06-19T09:45+02:00 — Implemented the safe shared UI checkpoint: `coolReactionsEnabled` is generated false for dev and prod, `app-cool-button` accepts entity type/id, eligibility, and count display mode, and its component-scoped data service makes no backend calls unless the flag is on and the entity is eligible. Focused specs cover gate-off no-call behavior, ineligible no-call behavior, enabled state/count loading, optimistic rollback, and rendered ARIA/count output.
- 2026-06-19T09:45+02:00 — With explicit operational approval, applied the approved additive Cool migration to linked Supabase project `sozmatmywjpstwidzlss` and verified `reactions` / `reaction_counts` exist remotely. `pnpm updateBackendTypes` remains blocked because unrelated local migration families are still absent/divergent on the linked project; keep `coolReactionsEnabled` disabled by default until safe typegen/operational verification is complete.
- 2026-06-19T10:47+02:00 — Completed the gated modules/public-racks surface wiring checkpoint. `app-cool-button` is present on module detail, module list cards, rack detail, and rack list cards with `public === true` eligibility and count mode, while host-level `coolReactionsEnabled` guards prevent even component instantiation with the default-off flag. Focused surface specs import the real Cool button, provide `COOL_REACTIONS_ENABLED=false`, and verify no `.coolButton` rendering or reaction backend calls. Patches remain out of scope for this checkpoint.
- 2026-06-19T09:20+02:00 — User clarified operational constraints for the remainder of this development slice: stay on `develop`, do not switch to `production`, do not release or push, and do not expose Cool frontend code to users. Keep `coolReactionsEnabled` default `false`. Local backend typegen may be evaluated only as a candidate diff; if it removes/regresses unrelated local schema/types due linked remote drift, revert the generated type-file changes and keep typegen blocked.
- 2026-06-19T10:57+02:00 — Ran `SUPABASE_PROJECT_ID=sozmatmywjpstwidzlss pnpm updateBackendTypes` locally and inspected the generated candidate. Rejected it because it removed the local `user_module_acquisitions` type, dropped the generated `reactions_user_id_fkey` relationship, and made `patches.public_id` / `racks.public_id` insert fields required despite DB defaults. Reverted only `src/backend/database.types.ts`; no remote changes were made.
