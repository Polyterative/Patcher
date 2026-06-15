<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Maintenance — Dependency deprecation audit

**Status:** Backlog.

**Why:** The Angular 22 upgrade still leaves known deprecated packages and transitive deprecation warnings. They should be tracked separately from the framework upgrade.

**Scope:**
- Run `pnpm outdated` and inspect deprecation warnings.
- Categorize each deprecated package as replace, defer, or accept.
- Prefer removing deprecated packages that are no longer used before introducing replacements.

**Success criteria:**
- Deprecated direct dependencies have a clear action or rationale.
- Any removed/replaced package is validated with build, lint, and targeted tests.

## Decision log

- 2026-06-15 — Added as a low-priority follow-up after the Angular 22 dependency cleanup.
