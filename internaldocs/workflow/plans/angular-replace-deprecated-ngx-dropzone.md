<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Angular — Replace deprecated ngx-dropzone

**Status:** Backlog.

**Why:** `ngx-dropzone` is deprecated and no longer receives updates, so upload UI should move to a maintained option or a small native drag/drop implementation.

**Scope:**
- Identify current `ngx-dropzone` usage and required upload interactions.
- Choose either the maintained successor package or a repo-owned drag/drop component.
- Preserve file validation, previews, accessibility, and error messaging.
- Remove `ngx-dropzone` after migration.

**Success criteria:**
- Upload flows work without `ngx-dropzone`.
- Dependency is removed from `package.json` and lockfile.

## Decision log

- 2026-06-15 — Added as a low-priority follow-up after dependency deprecation review.
