# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.

---

## Active

### Comments — Avoid Full-Width Layout on Large Screens

**Goal:** keep comment surfaces readable on large screens by bounding the list, empty state, filters, and composer to a deliberate reading rail instead of letting them stretch across the full page.

#### Layer 1 — MVP
- [x] Trace the comment hosts that currently render at full width on large screens
- [x] Apply a bounded large-screen rail pattern to the shared comment surface without regressing compact layouts
- [x] Keep the main comment states (list, empty state, composer, pagination/load-more) visually tied to the same width contract

**Layer 1 discoveries:** `app-comments-root` is shared by module detail, patch detail, and rack detail. Rack detail already wraps it in a `lib-screen-wrapper maxSize="45rem"`, while module detail and patch detail currently leave it effectively unconstrained. The separate `user-comments` route has its own filter/list/empty-state layout and still uses a raw full-width flow.

#### Layer 2 — Structural
- [x] Reuse the same width contract across the shared `comments-root` flow and the user-area comments page instead of introducing one-off host overrides
- [ ] Add focused responsive coverage for the bounded comment layout

#### Layer 3 — Polish
- [ ] Tune the alignment of filters, load-more/pagination, and empty-state messaging so the bounded rail feels intentional rather than artificially narrow
- [ ] Review the result in the main hosts (module detail, patch detail, rack detail, user comments) so comments read consistently across surfaces

**Current progress:** the shared `comments-root` now keeps its list, load-more action, empty state, and composer on a centered 48rem reading rail; the same width contract now applies to the dedicated user-comments page; and the empty states no longer sprawl across the whole page width on desktop-sized layouts.

---

## Empty template

```markdown
### Feature Name

**Goal:** one sentence.

#### Layer 1 — MVP
- [ ] step

#### Layer 2 — Structural
- [ ] step

#### Layer 3 — Polish
- [ ] step
```
