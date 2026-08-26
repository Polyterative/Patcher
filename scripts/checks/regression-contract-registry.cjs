/**
 * Regression-contract registry (Slice 3a).
 *
 * An explicit, hand-curated, versioned list of high-risk sources with
 * historically zero/thin direct spec coverage (see the thin-coverage backlog
 * line in internaldocs/workflow/TODO.md). Touching a registered `source` in a
 * commit must also touch at least one file matching one of its
 * `acceptedSpecGlobs`, enforced by scripts/checks/check-regression-contract.cjs
 * via lint-staged (see package.json's `lint-staged["src/**\/*.ts"]`).
 *
 * Membership here is deliberately NOT inferred from file size, git diff
 * operators, or "is this any .ts file" - the registry is the only source of
 * truth. Add, remove, or re-map an entry only through an explicit PR that
 * updates the `reason` below; `check-regression-contract.test.cjs`'s O-ST18/
 * O-ST19 cases assert every path here still resolves against the real repo.
 *
 * Note: internaldocs/workflow/TODO.md's backlog line previously read "11
 * complex files" while enumerating exactly the 10 names registered below - a
 * pre-existing wording mismatch flagged independently by three panel seats
 * during Slice 3a's huddle. Fixed directly in that doc alongside this slice
 * (tightly coupled to this exact registry), not left as a dangling TODO.
 */
module.exports = {
  version: 1,
  entries: [
    {
      source: 'src/app/components/rack-parts/rack-detail-persistence-operations.service.ts',
      acceptedSpecGlobs: ['src/app/components/rack-parts/rack-detail-data.service*.spec.ts'],
      reason:
        'Consumed exclusively by RackDetailDataService; it has no dedicated spec file and is only ' +
        'exercised through that aggregate rack-detail-data.service*.spec.ts family.'
    },
    {
      source: 'src/app/components/rack-parts/rack-detail-module-placement-data.service.ts',
      acceptedSpecGlobs: ['src/app/components/rack-parts/rack-detail-data.service*.spec.ts'],
      reason:
        'Consumed exclusively by RackDetailDataService; it has no dedicated spec file and is only ' +
        'exercised through that aggregate rack-detail-data.service*.spec.ts family.'
    },
    {
      source: 'src/app/components/rack-parts/rack-detail-module-replacement-data.service.ts',
      acceptedSpecGlobs: ['src/app/components/rack-parts/rack-detail-data.service*.spec.ts'],
      reason:
        'Consumed exclusively by RackDetailDataService; it has no dedicated spec file and is only ' +
        'exercised through that aggregate rack-detail-data.service*.spec.ts family.'
    },
    {
      source: 'src/app/components/patch-parts/patch-detail-linked-rack.bindings.ts',
      acceptedSpecGlobs: ['src/app/components/patch-parts/patch-detail-data.service*.spec.ts'],
      reason:
        'Sole consumer is PatchDetailDataService; it has no dedicated spec file and is only ' +
        'exercised through that aggregate patch-detail-data.service*.spec.ts family.'
    },
    {
      source: 'src/app/components/module-parts/module-editor/module-editor-panel-state.service.ts',
      acceptedSpecGlobs: ['src/app/components/module-parts/module-editor/module-editor.component.spec.ts'],
      reason: 'Only consumed by ModuleEditorComponent; it has no dedicated spec file of its own.'
    },
    {
      source: 'src/app/components/module-parts/module-editor/module-editor-form-state.service.ts',
      acceptedSpecGlobs: ['src/app/components/module-parts/module-editor/module-editor.component.spec.ts'],
      reason: 'Only consumed by ModuleEditorComponent; it has no dedicated spec file of its own.'
    },
    {
      source: 'src/app/features/backbone/login/user-management-account-actions.service.ts',
      acceptedSpecGlobs: ['src/app/features/backbone/login/__tests__/user-management-service/*.spec.ts'],
      reason:
        'Injected into UserManagementService; it has no dedicated spec file and is only exercised ' +
        'through that aggregate __tests__/user-management-service/*.spec.ts directory.'
    },
    {
      source: 'src/app/features/backbone/login/user-management-auth-flow.service.ts',
      acceptedSpecGlobs: ['src/app/features/backbone/login/__tests__/user-management-service/*.spec.ts'],
      reason:
        'Injected into UserManagementService; it has no dedicated spec file and is only exercised ' +
        'through that aggregate __tests__/user-management-service/*.spec.ts directory.'
    },
    {
      source:
        'src/app/components/module-collection-parts/module-collection-editor/module-collection-editor-data.service.ts',
      acceptedSpecGlobs: [
        'src/app/components/module-collection-parts/module-collection-editor/module-collection-editor-data.service.spec.ts'
      ],
      reason: 'Already has its own direct (but thin) spec file.'
    },
    {
      source: 'src/app/features/routes/user-area/user-marketplace/user-listings/user-listings-data.service.ts',
      acceptedSpecGlobs: [
        'src/app/features/routes/user-area/user-marketplace/user-listings/user-listings-data.service.spec.ts'
      ],
      reason: 'Already has its own direct (but thin) spec file.'
    }
  ],
  // Explicit, reviewed escape hatch: exact registered `source` paths exempted
  // from the requirement above (for example a follow-up commit that only
  // reverts/renames without behavior change). Every entry here must exactly
  // match a `source` above (checked by validateRegistry). Empty by default -
  // add an entry only with a recorded reason in the PR description.
  exceptions: []
};
