# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file at the start of every session.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.

---

## Active

### Homepage Lazy Loading

**Goal:** Defer rendering of below-fold homepage sections (especially proof showcases with API calls + panel images) until they enter the viewport, saving initial resource load.

---

#### Key files

- `src/app/features/backbone/home/home.component.html`
- `src/app/features/backbone/home/home.component.scss`
- `src/app/features/backbone/home/components/home-invitation-cta/home-invitation-cta.component.html`

---

#### Layer 1 – MVP (data wiring)

- [x] Wrap `@switch` content inside proof section device frames with `@defer (on viewport)` + `@placeholder`
- [x] Wrap `app-home-open-principles` with `@defer (on viewport)`
- [x] Wrap `app-home-workflow-rail` with `@defer (on viewport)`
- [x] Wrap `app-home-invitation-cta` with `@defer (on viewport)`

#### Layer 2 – Structural (template)

- [x] Add `loading="lazy"` to CTA logo `<img>`
- [x] Add `.frame-placeholder` CSS with min-height for device frame placeholder

#### Layer 3 – Polish

- [ ] (Follow-up) Tie data service timer calls to viewport visibility instead of blind timers

---

#### Decisions / notes

- Using Angular built-in `@defer (on viewport)` — no extra deps needed, uses IntersectionObserver
- Proof section outer structure (`app-home-proof-showcase`, `.frame-host`, `lib-device-frame-wrapper`) stays eagerly rendered for layout; only the heavy sub-component content is deferred
- Hero section is above-fold, so NOT deferred
- Data service calls remain timer-based for now; deferring rendering is the high-impact change

---

#### Status

In progress.
