<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Angular — Clean up safe-navigation migration wrappers

**Status:** Backlog.

**Why:** Angular 22 wrapped some template optional chaining expressions in `$safeNavigationMigration(...)` to preserve Angular 21 behavior. These wrappers are correct but noisy and should be reviewed deliberately.

**Scope:**
- Inventory `$safeNavigationMigration(...)` usage.
- Replace wrappers with clearer null-safe template expressions where behavior is equivalent.
- Keep wrappers where they are required to preserve legacy null/undefined semantics.

**Success criteria:**
- Remaining wrappers are intentional.
- Rewritten expressions have equivalent behavior and pass template compilation.

## Decision log

- 2026-06-15 — Added as a low-priority cleanup after Angular 22 template migration.
