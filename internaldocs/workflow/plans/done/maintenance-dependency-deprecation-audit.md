<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Maintenance — Dependency deprecation audit

**Status:** Done.

## Problem

The Angular 22 upgrade and safe dependency update batch left a small set of direct outdated/deprecated dependency signals. The repo needs a concise inventory so future agents know which packages can be removed now, which upgrades are safe, and which warnings are intentional framework/dependency-transition debt.

## Goals

- Run the current package inventory with `pnpm outdated` and lockfile deprecation inspection.
- Identify direct deprecated packages and any unused direct dependencies that can be safely removed.
- Apply only low-risk manifest/lockfile cleanup that is proven unused or already pinned safely.
- Document remaining replace/defer/accept decisions.

## Assumptions

- No new dependencies are introduced in this slice.
- Major package upgrades are deferred unless they are required to remove a direct deprecation warning safely.
- Angular animation package deprecation is a known transitional warning while existing `@angular/animations` APIs remain in use.

## Layers

### MVP

- [x] Run `pnpm outdated` and inspect deprecation warnings from the lockfile/install output.
- [x] Search for usage of direct packages that appear deprecated, obsolete, or suspiciously unused.

### Structural

- [x] Categorize each direct deprecated/outdated risk as replace, defer, or accept.
- [x] Remove only dependencies that are proven unused by repo search and package-manager validation.

### Polish

- [x] Refresh the lockfile after manifest changes.
- [x] Validate with install/lock checks, targeted checks when relevant, `pnpm lint`, and docs check.

## File-level checklist

- [x] `package.json` — remove or adjust only proven-safe dependencies.
- [x] `pnpm-lock.yaml` — refresh through `pnpm install --lockfile-only` or an equivalent pnpm command.
- [x] `internaldocs/workflow/plans/maintenance-dependency-deprecation-audit.md` — record the inventory and decisions.
- [x] Workflow docs — archive the task after validation.

## Acceptance criteria

- Deprecated direct dependencies have an explicit replace/defer/accept rationale.
- Any removed dependency has no remaining app/test/script imports or config references.
- `pnpm install --lockfile-only`, `pnpm lint`, and `node scripts/checks/check-docs.cjs` pass after changes.

## Validation strategy

- `pnpm outdated --format table || true`
- Lockfile deprecation scan for `deprecated:` metadata.
- Usage search for candidate removable packages.
- `pnpm install --lockfile-only`
- `pnpm lint`
- `node scripts/checks/check-docs.cjs`

## Audit outcome

### Replace / defer

- `@angular/animations` — replace with Angular's `animate.enter` / `animate.leave` and native style transitions over time. Deferred because the app still has widespread direct DSL imports (`trigger`, `transition`, `query`, `stagger`, `animateChild`, keyframes) across feature and shared components; removing it now would be behavioural, not maintenance-only.
- `@angular/platform-browser-dynamic` — replace during a future bootstrap modernization, likely alongside a standalone/bootstrap API migration. Deferred because `src/main.ts` still bootstraps the NgModule app with `platformBrowserDynamic()`, and `src/test.ts` uses the matching dynamic testing platform.

### Defer

- Non-deprecated outdated direct packages from `pnpm outdated` (`@supabase/supabase-js`, `@sentry/cli`, `@types/jasmine`, `@types/luxon`, `@types/node`, `body-parser`, `express`, `fast-uri`, `jasmine-core`, `lint-staged`, `sigma`, `graphology`, `graphology-layout-forceatlas2`, and related tooling packages) were deferred to a normal dependency-update slice. Their updates are version-risk work rather than deprecation cleanup.

### Accept

- Remaining lockfile `deprecated:` metadata after cleanup is either from still-used Angular transition packages (`@angular/animations`, `@angular/platform-browser-dynamic`) or transitive release-tooling dependencies under `standard-version` (`git-raw-commits`, `git-semver-tags`, `glob`, `inflight`, `q`, `rimraf`, `stringify-package`, `uuid`). Accepted for this slice because replacing release tooling is outside the behaviour-preserving dependency audit.

### Remove

- Removed unused direct app dependencies: `@fortawesome/angular-fontawesome`, `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-brands-svg-icons`, `angular-animations`, `angular-html-parser`, `core-js`, `graphology-generators`, `graphology-layout`, `graphology-layout-force`, `graphology-types`, and `gsap`.
- Usage proof: exact import/config searches found no app, test, script, or config references for those packages. `core-js` only appeared in commented legacy polyfill examples. `graphology-types` remains available transitively through the graphology packages that still need it.
- Config cleanup: removed the stale `graphology-layout` `allowedCommonJsDependencies` entry from `angular.json`.

### Validation results

- `pnpm install --lockfile-only` — passed.
- `node scripts/checks/check-docs.cjs` — passed.
- `pnpm lint` — passed with the existing warning baseline (`2824 problems`, `0 errors`, `2824 warnings`) plus the existing R4 soft-limit warnings.
- `pnpm outdated --format table || true` — now reports only the two Angular deprecated direct packages and the deferred non-deprecated outdated packages listed above.

## Decision log

- 2026-06-15 — Added as a low-priority follow-up after the Angular 22 dependency cleanup.
- 2026-06-18T09:36+02:00 — Picked as loop round 1 because it was already staged in `CURRENT_FEATURE.md`; higher-priority open items require credentials, explicit Supabase approval, or are blocked by dependencies.
- 2026-06-18T09:36+02:00 — Completed the audit slice. Removed only direct packages with no active imports or config references, kept the deprecated Angular direct packages because they are still used, and deferred non-deprecated version upgrades to a separate dependency-update pass.

- 2026-06-18T09:36+02:00 — Archived after reviewer approval and successful validation.
