<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Angular — Migrate deprecated animations package usage

**Status:** Backlog.

**Why:** Angular 22 deprecates `@angular/animations` in favor of newer enter/leave animation primitives.

**Scope:**
- Inventory animation triggers and imports.
- Start with simple enter/leave transitions that map cleanly to the new primitives.
- Keep complex animations on the existing package until a safe equivalent is clear.
- Remove `@angular/animations` only when all usage is migrated.

**Success criteria:**
- Simple enter/leave animations use the current Angular 22 approach.
- No visual regressions in the main navigation, editor, browser, and dialog surfaces.

## Decision log

- 2026-06-15 — Added as a low-priority follow-up; migration should be visual-regression aware.
