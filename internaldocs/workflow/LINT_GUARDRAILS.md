# Mechanical guardrails (custom lints)

Detail for [`AGENTS.md`](../../AGENTS.md) §11.

These run as part of `pnpm lint`. Read the error message — each lint is written
to tell you exactly how to fix the violation, and points at the canonical doc.
Mechanical rules are catalogued in [`internaldocs/GOLDEN_PRINCIPLES.md`](../GOLDEN_PRINCIPLES.md).

- `scripts/checks/check-layering.cjs` — enforces `Component → Data Service → API Service → Supabase`.
  - **R1** Components must not import `SupabaseService` directly — use a co-located `*-data.service.ts`.
  - **R2** Files outside `features/backend/` must not import `DatabaseStrings`.
  - **R3** API services must not depend on component-scoped data services.
  - **R4** `*.ts` files >500 lines warn, >1000 lines error. Split.
  - Existing violations are grandfathered in `scripts/checks/.layering-baseline.json`.
    Refactor to remove entries; update the baseline only with explicit justification
    (`node scripts/checks/check-layering.cjs --update-baseline`).
  - **`.layering-baseline.json` merge conflicts are common** across parallel/stacked refactor branches that each remove an entry
    (e.g. explicit-any burn-down, rack-editor splits). Resolve by taking the union of removed entries from both sides (keep an
    entry only if *neither* branch removed it), then re-run `node scripts/checks/check-layering.cjs --update-baseline` and diff
    the result against your manual merge to confirm it matches before committing.
- `scripts/checks/check-route-module-imports.cjs` — `RouterModule.forRoot()` only in `app-routing.module.ts`; lazy-loaded route modules cannot be imported as shared UI.
- `scripts/checks/check-px-ts.sh` — hardcoded `px` in `*.ts` (use `rem`; annotate intentional `px` with `// px-ok`).
- `scripts/checks/check-docs.cjs` — broken markdown links inside `internaldocs/`, missing personas, plan files without a Decision log, `CURRENT_FEATURE.md` partial active feature or stale `Updated:` stamp, undated pending Approvals-ledger questions, and new `COMPLETED.md` entries without a commit hash.

