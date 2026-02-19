# Current Feature / AI RAM

> **Rules for AI agents using this file:**
> 1. **Read this file at the start of every session** — it describes the feature currently being developed.
> 2. **Keep it updated as you work** — check off steps, add discoveries.
> 3. **One feature at a time** — when a feature is complete, archive the content as a one-line summary in TODO.md
     > Completed, then reset this file to the Empty Template at the bottom.
> 4. **This file owns the detail; TODO.md owns the backlog.** — implementation steps, gotchas, file names live here.
     > TODO.md only holds a one-line entry per feature while it is in progress.

---

## Feature: Safari Image Export Fix

**Status:** 🟡 In progress  
**Started:** Feb 19

### Goal

Fix rack image export (download to computer + upload preview) failing on Safari/WebKit. The root cause is `dom-to-image`
(v2.6.0), which has well-documented Safari incompatibilities (foreign-object serialization, CORS tainting, SVG
rendering). Replace it with `html-to-image`, a maintained fork with Safari fixes.

### Context

- **Affected file:** `src/app/components/rack-parts/rack-detail-data.service.ts`
- **Current library:** `dom-to-image` v2.6.0 (`import domtoimage from 'dom-to-image'`)
- **Two call sites:** `downloadRackImageToUserComputer$` (line ~271) and `updateRackImagePreview$` (line ~304) — both
  use `domtoimage.toJpeg()`
- **Replacement library:** `html-to-image` — drop-in compatible API (`toJpeg(node, options)`)
- **Package deps:** `dom-to-image` (runtime) + `@types/dom-to-image` (devDep) — both to be removed
- **No other files import `dom-to-image`** — confirmed via grep

### Steps

- [ ] Install `html-to-image` (`yarn add html-to-image`)
- [ ] Remove `dom-to-image` and `@types/dom-to-image` (`yarn remove dom-to-image @types/dom-to-image`)
- [ ] Update import in `rack-detail-data.service.ts`: replace `import domtoimage from 'dom-to-image'` with
  `import { toJpeg } from 'html-to-image'`
- [ ] Replace both `domtoimage.toJpeg(...)` call sites with `toJpeg(...)`
- [ ] Verify no TypeScript errors
- [ ] Run full test suite to confirm no regressions

### Gotchas

- `html-to-image`'s `toJpeg` takes `(node, options)` directly — same shape as `dom-to-image`, so the swap is mechanical
- The `quality` and `bgcolor` options are supported by `html-to-image` with the same names (`backgroundColor` instead of
  `bgcolor` — need to verify)
- Both call sites cast the element as `<any>` — keep that for now
- No unit tests exist for the image export flow (it's DOM/canvas-dependent), so the full test suite is the validation