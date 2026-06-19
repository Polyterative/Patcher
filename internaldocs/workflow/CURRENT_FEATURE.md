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

Cross-entity Cool reactions — design refinement checkpoint complete

Plan: [module-cool-appreciation-button.md](./plans/module-cool-appreciation-button.md)
Status: **Local additive backend checkpoint, shared UI/data-service checkpoint, modules/public-racks surface wiring checkpoint, user-area Cool collection, and the Cool design-refinement placement checkpoint are implemented. Cool UI is intentionally visible in generated development builds for review, while generated production builds remain off. Approved Patch preview and Cool migrations are applied on the linked Supabase project, but broader linked-database migration/typegen drift remains. A local `pnpm updateBackendTypes` candidate was rejected as regressive, so manual backend types remain for now.**
Staged: 2026-06-19T09:21+02:00

#### Why this is next

- Patch SVG preview backend/storage and timestamp-preservation checkpoints now exist locally and on the linked Supabase project, but broader migration history still differs from the local repo.
- The remaining Patch SVG preview UI/data-service work depends on safe typegen/operational verification and must stay blocked until the remaining drift is resolved or explicitly accepted.
- Cross-entity Cool reactions is the next highest-priority non-held INFRA item with a plan. The local backend and shared guarded UI checkpoints are complete, and the approved remote Cool objects now exist; production-facing UI remains gated until typegen/operational verification is safe.

#### Safety gate

- Read `internaldocs/patterns/BACKEND_METHODS.md` schema-change preflight before any SQL draft.
- Do not switch to `production`, release, push, or expose Cool frontend code through production while this feature is still in development.
- Work on `develop` is allowed to be review-visible. Production rollout is a separate manual user action; agents must not switch to
  `production`, release, or push.
- Before adding/changing meaningful Cool UI placement, ask for a short UX placement approval or route through `designer`; code execution
  can remain autonomous after the visible direction is approved.
- Backend changes must remain additive/backward-compatible unless the user explicitly approves a breaking production-risking backend change
  while present.
- Keep generated development/local `coolReactionsEnabled` `true` so the user can review Cool on `develop`; generated production must remain `false`.
- `pnpm updateBackendTypes` is allowed only as a local candidate diff on `develop`. Keep it only if it is non-regressive; if linked remote drift removes/regresses unrelated local schema/types, revert the generated type-file changes and document the blocker.
- Do not enable production-visible Cool UI or wire Patch preview generation until remaining linked Supabase drift is reconciled or explicitly accepted.
- Typegen blocker: 2026-06-19 candidate generation against linked project `sozmatmywjpstwidzlss` removed the local `user_module_acquisitions` table type, dropped the `reactions_user_id_fkey` relationship, and made `patches.public_id` / `racks.public_id` inserts required again. The generated `src/backend/database.types.ts` diff was reverted.
- Initial implementation scope should be narrow: modules and public racks first, patches in the structural layer after the data path is proven.
- Any UI wiring before remote migration application must be behind a disabled-by-default feature guard so the current production build never queries missing Cool backend objects.

#### Layer checklist

- [x] Re-read the existing Cool plan and stage it as the active safe task.
- [x] Record the explicit schema/RLS approval question in the plan.
- [x] Record conditional user approval for the narrow, non-breaking schema/RLS checkpoint.
- [x] Draft the narrow schema/RLS/trigger checkpoint for reactions and reaction counts.
- [x] Implement backend methods through `SupabaseService` only, with cache keys and focused tests.
- [x] Add disabled-by-default shared Cool UI/data-service wiring for the approved MVP surfaces, with tests proving no backend calls when gated off.
- [x] Wire `app-cool-button` into module and rack detail pages only for modules plus public racks; repeated list/card surfaces must not show Cool buttons.
- [x] Add the gated user-area Cool collection for cooled modules and public racks only, grouped by entity type, newest-first, with inline uncool.
- [x] Refine Cool placement: module detail Cool lives in the top-left module action row, rack detail Cool lives in the left rack action strip, and user-area Cool is a Modules tab/filter rather than a root section.

#### Approval queue

- **Approval requested 2026-06-19T09:21+02:00:** May the next implementation checkpoint draft and apply a narrow Cool reactions schema/RLS plan for a polymorphic `reactions` table plus aggregate `reaction_counts` support, limited initially to modules and public racks? Default if not approved: keep work planning/docs-only and do not create migrations, policies, RPCs, or generated type changes.
- **Approval recorded 2026-06-19T09:20+02:00:** User approved “as usual” only if the checkpoint is not a breaking change to the current production build. Treat this as conditional approval for additive/narrow schema/RLS work only: modules + public racks initially, no unrelated RLS/policy changes, and stop before any breaking change or risky production behavior.
- **Operational constraint recorded 2026-06-19T09:20+02:00:** Do not use the production branch, release, push, or expose Cool frontend code. Backend type updates may be tried locally on `develop` only if the resulting diff is non-regressive.

#### Validation strategy

- Docs-only gate: `node scripts/checks/check-docs.cjs` and `git diff --check`.
- Gated UI checkpoint: focused Cool button/data-service specs proving gate-off no-op behavior, plus `pnpm lint`.
- After remote migration/typegen reconciliation: focused backend/cache specs, Cool button/user-area specs, auth E2E where practical, then `pnpm lint`.

#### Decision log

- 2026-06-19T09:21+02:00 — Pivoted from Patch SVG previews after read-only Supabase inspection reconfirmed linked migration/typegen drift and missing patch preview remote objects. Staged Cross-entity Cool reactions as planning/approval-gate only because it requires schema/RLS/policy work before code can safely start.
- 2026-06-19T09:20+02:00 — User conditionally approved the next Cool reactions schema/RLS checkpoint only if it is non-breaking for the current production build. Scope remains additive and narrow: polymorphic `reactions` plus aggregate `reaction_counts`, modules + public racks initially, no unrelated RLS/policy changes, and stop before any breaking change or risky production behavior.
- 2026-06-19T09:32+02:00 — Implemented the local-only backend checkpoint with additive `reactions` / `reaction_counts` migration objects, narrow RLS, SupabaseService add/delete/get methods, cache keys, and focused tests. Skipped remote typegen because linked Supabase drift is already recorded; manually updated `src/backend/database.types.ts` for the two new tables. Reviewer pass narrowed module eligibility to `modules.public = true` so aggregate counts cannot expose non-public module IDs.
- 2026-06-19T09:43+02:00 — Reconciled workflow state after the backend checkpoint. Because the current production database may not have the new Cool objects yet, the next UI/data-service work is only safe if it is disabled by default and tests prove it performs no Cool backend reads/writes while gated off.
- 2026-06-19T09:45+02:00 — Added disabled-by-default `coolReactionsEnabled` environment flag plus shared `app-cool-button` / component-scoped data service. The service routes enabled reads/writes through `SupabaseService`, optimistically toggles with rollback, and focused specs prove feature-off and ineligible paths render no button and make no Cool backend calls.
- 2026-06-19T09:45+02:00 — With explicit operational approval, applied only the already-approved Patch preview and Cool additive migrations to linked Supabase project `sozmatmywjpstwidzlss`. Verified `patches.image`, public `patches` bucket, patch timestamp trigger, `reactions`, and `reaction_counts` now exist remotely. `pnpm updateBackendTypes` remains blocked because unrelated local migration families are still absent/divergent on the linked project.
- 2026-06-19T10:47+02:00 — Wired the shared Cool button into module detail, module list cards, rack detail, and rack list cards only. Hosts additionally check `environment.features.coolReactionsEnabled` before instantiating the button, so the default-off dev/prod flag renders no control and performs no reaction backend calls; eligibility remains `public === true` for modules and racks. Patches remain intentionally unwired.
- 2026-06-19T09:20+02:00 — User clarified operational constraints: stay on `develop`, do not switch to `production`, do not release or push, and keep the Cool frontend hidden/default-off while the feature is still being developed. Local backend typegen is allowed only as a candidate diff; reject it if linked remote drift regresses unrelated local schema/types.
- 2026-06-19T10:57+02:00 — Evaluated `SUPABASE_PROJECT_ID=sozmatmywjpstwidzlss pnpm updateBackendTypes` as a local candidate. Rejected and reverted the generated `src/backend/database.types.ts` diff because it regressed unrelated local schema/types: removed `user_module_acquisitions`, removed the `reactions_user_id_fkey` relationship, and made DB-default `public_id` inserts required for patches/racks. Keep manual local types until linked migration/typegen drift is reconciled.
- 2026-06-19T10:59+02:00 — User clarified that Cool should be visible on `develop` for review. Production/release remains blocked: do not switch branches, release, push, or expose Cool via production. Keep generated dev/local `coolReactionsEnabled` on and generated production off; typegen remains manual because the linked project still produces regressive unrelated type drift.
- 2026-06-19T11:19+02:00 — User clarified Cool placement after reviewing develop: avoid many Cool buttons in a row. Keep Cool visible for review only on slash/detail-style pages and user-owned Cool collection interactions; remove repeated module/rack list card controls even when the develop flag is on. Detail-page placement can stay near the existing community/statistics/action rail.
- 2026-06-19T11:05+02:00 — Implemented the next user-area Cool collection checkpoint for modules and public racks only; patches remain deferred to the structural layer. The collection stays behind `COOL_REACTIONS_ENABLED`, performs no Cool backend calls while disabled, fetches public module/rack details in batch, groups by entity type newest-first, and removes Cool inline through the existing reaction delete path.
- 2026-06-19T11:52+02:00 — Applied the Cool design handoff: removed the standalone module detail Community/Cool card, projected Cool into the module primary action row, moved rack Cool from the right insight grid into the left rack action strip, and made Cool a Modules-area tab/filter with grouped module/rack results. Repeated module/rack list cards remain free of Cool buttons; production flag remains off and dev/local remains on.
- 2026-06-19T12:31+02:00 — User clarified loop operating policy: agents should work freely on `develop`, keep production/release/push out of scope, and avoid backend-breaking changes that could break the currently published production app unless explicitly approved. Feature flags are optional and only needed for hidden/incomplete work or rollout safety. UX planning should be more collaborative: ask on visible placement/hierarchy decisions, then execute autonomously.
