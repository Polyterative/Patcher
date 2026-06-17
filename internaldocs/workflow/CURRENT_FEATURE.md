# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut).
>    Future agents read this to avoid relitigating settled questions.

---

## Active

### LOW: Angular — Replace deprecated ngx-dropzone

- **Plan:** [`plans/angular-replace-deprecated-ngx-dropzone.md`](./plans/angular-replace-deprecated-ngx-dropzone.md)
- **Status:** Implemented — awaiting coordinator review.
- **Started:** 2026-06-17T17:56+02:00
- **Coordinator:** coordinator-loop

#### Layer checklist

- [x] MVP — Replace `ngx-dropzone` runtime usage with a native file input / drag-drop host while preserving single vs multi-file behavior.
- [x] Structural — Remove the direct dependency and lockfile entries once no code imports it.
- [x] Polish — Preserve image/file previews, rejection feedback, and accessible keyboard/click upload affordances.

#### Decision log

- 2026-06-17T17:56+02:00 — Picked this over HIGH backlog items because the HIGH manufacturer/security/E2E tasks are blocked by approval, credentials, or broad multi-slice remediation; this is self-contained and removes a deprecated direct dependency.
- 2026-06-17T17:59+02:00 — Replaced `ngx-dropzone` with a repo-local file-add event and native input/drop validation so no successor dependency is needed.
