# Acceptance Checklist

## Manufacturer Pages — Phase 1 Polish

- [x] Manufacturer logo renders in the detail page header when `manufacturer.logo` is set
- [x] When no logo is set the layout does not break (guarded with `@if (logoUrl(...))`)
- [x] Logo display is consistent with the existing `manufacturer-row` pattern (same Supabase storage URL, alt text)
- [x] Module catalogue defaults to "Group by standard (3U / 1U)" — `defaultGroupId` input added to `ModuleListComponent` (backward-compatible); manufacturer detail sets `[defaultGroupId]="'standard'"`
- [x] Data-report guidance note added below the module list when modules are present; points users to the per-module "Report an issue" flag component
- [x] Build green, tests green (4/4 module-list)
