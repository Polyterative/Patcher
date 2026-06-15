<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Angular — Replace deprecated Flex Layout

**Status:** Backlog.

**Why:** `@angular/flex-layout` is deprecated and remains a long-term Angular compatibility risk after the Angular 22 upgrade.

**Scope:**
- Inventory `@angular/flex-layout` imports and `fx*` template usage.
- Replace usage gradually with CSS grid/flex utilities, existing shared layout helpers, and Angular CDK layout only where runtime breakpoint observation is genuinely needed.
- Remove `@angular/flex-layout` once no imports or directives remain.

**Success criteria:**
- No `@angular/flex-layout` dependency or imports remain.
- Existing responsive layouts keep equivalent behavior across primary breakpoints.

## Decision log

- 2026-06-15 — Added as a low-priority follow-up after the Angular 22 upgrade; defer because it is broad UI/layout work.
