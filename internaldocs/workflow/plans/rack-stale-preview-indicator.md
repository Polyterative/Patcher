<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Rack — Stale preview indicator

**Why:** After editing modules in a rack the preview image no longer reflects the current
state, but there is no indication of this. The user has no way to know the image is stale
without remembering when they last regenerated it.

**Zero-schema approach:** the preview filename already encodes its generation timestamp
(e.g. `336_2026-05-1509-54-15073.jpeg`). Parse the date portion and compare to
`rack.updated` — if `rack.updated > imageGeneratedAt`, the preview is stale. No new DB
column needed.

**Visual treatment (minimal, integrated):**
- A small overlay chip/badge positioned over the rack image (bottom-left or top-right
  corner), visible **only to the rack owner** when the preview is stale.
- Label: a simple icon (e.g. `sync` or `image_not_supported`) with no text, or at most
  a compact *"Preview outdated"* tooltip on hover. Should not obscure the image content.
- Style: semi-transparent, uses the design system's muted/secondary token palette — not
  a warning colour (it is informational, not an error).
- Clicking the badge triggers the existing "Update preview" action directly (shortcut).
- When no image exists at all, the existing empty-state handling covers it — no extra
  indicator needed.

**Checklist:**

- [ ] Implement `isPreviewStale(rack: Rack): boolean` pure function: parse the date from
      `rack.image` filename (regex on `_YYYYMMDDH...` segment), compare to
      `new Date(rack.updated)`. Return `false` if image is null/unparseable.
- [ ] In `rack-image.component` (or its parent), expose `isStale` as an `@Input` or derive
      it from the rack data already available.
- [ ] Add the overlay badge to the rack image template, guarded by
      `isOwner && isStale && image !== null`.
- [ ] Wire the badge click to the existing "Update preview" action (emit through the data
      service, no new backend method needed).
- [ ] Unit-test `isPreviewStale` with fixture filenames and dates.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

