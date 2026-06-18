# Bug — Rack list images pop in abruptly; reuse the modules panel-image load animation

## Status

`[x]` Implemented in loop 5 — visual / motion polish on a core browsing surface (`/racks`).
No data, schema, or RLS work. Component-level Angular animation + small CSS
fix, ideally extracted as a shared image-load-fade helper used by both
`app-module-part-image` and `app-rack-image`. Regression coverage with a
component spec plus a visual snapshot via `patcher-ui-debug`.

## User intent

> "Another one rack images in slash racks load abruptly. I want them loading
> nicely with an animation exactly like we do in slash modules for panels."

On `/racks`, the JPEG rack previews inside each card become visible the moment
the bitmap finishes decoding — there is no fade, no skeleton, no
load-synchronised opacity transition. The card frame appears, then the image
pops in fully opaque a noticeable beat later. On `/modules`, the panel image
inside each module card feels smooth: a short staged opacity enter, no jarring
flash, the panel materialises as part of the card. The user wants the rack
list to feel the same — specifically the same motion language and timing as
the modules panel images.

## Product / roadmap fit

- `/racks` is one of the four canonical browsing surfaces (along with
  `/modules`, `/patches`, `/users`) and is the public entry point to the
  Rack content type, which is **load-bearing for the marketplace and trust
  layer** described in [`internaldocs/product/ROADMAP.md`](../../../product/ROADMAP.md).
  Visual instability on this surface erodes the same trust that listings,
  shipping, and reputation features will later depend on.
- Aligns with [`internaldocs/DESIGN_LANGUAGE.md`](../../../DESIGN_LANGUAGE.md):
  - "Functional animation only — feedback loops that convey state, not
    decoration." A load-driven fade is exactly that: it conveys
    *"the bitmap is now present"*.
  - "Loading states are honest: skeleton or spinner, never false progress."
    The current behaviour is dishonest in the opposite direction — the frame
    is opaque and ready while the image is still arriving, then snaps.
  - "Short and intentional. If it takes longer than 150ms it needs
    justification." The modules pattern uses ~180–725ms; this plan keeps the
    rack list within the same already-justified envelope rather than
    inventing a new motion budget.
  - "1px off is 1px wrong" — extended to motion, "1 abrupt frame is 1 wrong
    frame" on a content card whose entire purpose is to make a rack look
    composed and credible.
- No roadmap line item, but this is the kind of polish that the marketplace
  cockpits, manufacturer pages, and rack-comparison surfaces will all reuse
  as soon as the underlying primitive exists. Fixing it once at the
  primitive level pays for itself across every future image-bearing card.

## Current system analysis

### Surfaces affected (where rack preview images render)

- `/racks` list — the abrupt one, primary target of this plan.
  - [`src/app/features/routes/rack/rack-browser-root/rack-browser-root.component.html`](../../../../src/app/features/routes/rack/rack-browser-root/rack-browser-root.component.html)
    hosts `<app-rack-list>` inside `.rack-results-shell`.
  - [`src/app/components/rack-list/rack-list.component.html`](../../../../src/app/components/rack-list/rack-list.component.html)
    iterates racks into `<lib-clean-card>` with the card-level
    `[@enter]`/`[@leave]` stagger, and inside each card renders
    `<app-rack-micro>`.
  - [`src/app/components/rack-micro/rack-micro.component.html`](../../../../src/app/components/rack-micro/rack-micro.component.html)
    contains `<app-rack-image>` and the title/author/HP row.
  - [`src/app/components/rack-parts/rack-image/rack-image.component.html`](../../../../src/app/components/rack-parts/rack-image/rack-image.component.html)
    renders the `<img>` (or fallback tile) with the `rack-image-enter`
    keyframe and the shared `image-transition` class.

- `/racks/details/:id` rack detail and editor previews — same
  `<app-rack-image>` component, also benefit from the fix.

- Patch detail / rack-context surfaces, profile racks, and other places that
  embed `<app-rack-micro>` / `<app-rack-image>` — all pick the fix up for
  free.

### Why modules feel smooth and racks do not

- Module list cards render `<app-module-minimal>` → `<app-module-part-image>`
  ([`src/app/components/module-parts/module-minimal/module-part-image/module-part-image.component.ts`](../../../../src/app/components/module-parts/module-minimal/module-part-image/module-part-image.component.ts)),
  which combines:
  - A per-image Angular `@enter` trigger
    (`opacity 0 → 1`, `725ms ease`) defined in the component's `animations:`.
  - A parent `<app-module-minimal>` with staged
    `moduleDetailFadeEnter` / `moduleDetailInlineEnter` / `moduleDetailCopyEnter` /
    `moduleDetailActionsEnter` triggers, so the *media slot* fades first,
    then name, then meta, then copy. That stage is the visible "loading
    nicely" choreography the user is referring to.
  - A `.preview` placeholder rectangle sized to the panel's HP×3U geometry,
    rendered while `filename` is undefined — so layout never shifts.
  - `loading="lazy"` + `decoding="async"` on the `<img>`.
  - Panel images are small (typically tens of KB) and aggressively cached,
    so the bitmap decode usually finishes inside the 725ms enter window.
    The visible effect is a single smooth fade.

- Rack cards render `<app-rack-micro>` → `<app-rack-image>`
  ([`rack-image.component.html`](../../../../src/app/components/rack-parts/rack-image/rack-image.component.html))
  which has:
  - `animate.enter="rack-image-enter"` (Angular 21 native-CSS enter binding)
    with a `rack-image-fade-in` keyframe of `725ms ease`.
  - The shared `.image-transition` class
    ([`src/app/style/commons_customizations.scss`](../../../../src/app/style/commons_customizations.scss)
    line 208: `transition: opacity 0.3s; transition-delay: 0.2s;`).
  - `loading="lazy"`, `(error)` → `imageLoadFailed` fallback tile.
  - **No `(load)` binding.** The enter fade runs on element insertion, not
    on bitmap decode.
  - **No parent media-slot stagger.** `<app-rack-micro>` has no Angular
    `animations:` metadata and does not wrap the image in a
    `moduleDetailFadeEnter`-equivalent.
  - Rack JPEG previews are large (frequently 100–300 KB+), so the
    enter-fade completes well before the bitmap is decoded. The user sees
    the empty frame fade in, then a hard pop when the JPEG paints.

So the bug is two-layered:

1. **Per-image:** the fade is time-based on element insertion, not
   synchronised to the image `load` event. For heavy JPEGs this is
   structurally wrong — it cannot help.
2. **Per-card:** there is no media-slot stagger to give the image a
   coherent place inside the card animation, so even if the per-image fade
   worked correctly, the rack card would still feel less "composed" than
   the module card.

### Why fixing only the per-image layer is enough for the user's ask

The user explicitly framed this as *"loading nicely with an animation
exactly like we do in slash modules for panels"*. The dominant perceived
difference is the image pop. Matching the per-image behaviour (load-driven
opacity fade with a placeholder behind it, of the same duration and easing
the module path uses) closes the visible gap. The per-card media stagger is
worth adding as a Polish layer item but is not required to satisfy the
report.

### Shared helpers worth knowing about

- `.image-transition` in [`src/app/style/commons_customizations.scss`](../../../../src/app/style/commons_customizations.scss).
- Angular `:enter` animation idiom — used by both module-part-image and
  module-minimal; the canonical Patcher way to fade content in.
- `prefers-reduced-motion` is already respected via
  `BrowserAnimationsModule`'s `@.disabled` plumbing and per-component SCSS
  guards (e.g. `module-editor.component.scss:428`,
  `rack-balance-panel.component.scss:384`). Any new helper must keep that
  guarantee.
- No existing `appImageFade` / `appImageLoadFade` directive was found in
  `src/app/shared-interproject/` — this would be a net-new shared primitive
  if extracted.

## Future strategy

- **Default-correct image loading is a product-wide primitive.** Marketplace
  listings, manufacturer hero images, patch SVG previews
  ([`plans/patch-svg-previews.md`](../patch-svg-previews.md)), and OG image
  previews ([`plans/on-seo-og-image-generation.md`](../on-seo-og-image-generation.md))
  will all need the same "fade in once the bitmap is actually ready"
  behaviour. Extracting one helper now is cheaper than patching each
  surface later.
- **One motion grammar.** Patcher's design language is explicit that
  animation conveys state, not decoration. The same easing curve and
  duration band (`~180–725ms`, `cubic-bezier(0.22, 1, 0.36, 1)` or
  `ease`) should be used for every image-load fade. Avoid introducing a
  bespoke per-surface variant.
- **Layout stability first.** Future image surfaces should always reserve
  geometry (intrinsic ratio or fixed-height container) so the fade replaces
  a placeholder of identical box size — never a 0-height collapse that
  triggers CLS.

## Goals

- Rack preview images on `/racks` (and everywhere `<app-rack-image>` renders)
  fade into view in sync with the bitmap actually loading, not on element
  insertion.
- The fade matches the existing modules panel-image motion: opacity 0 → 1
  over the same duration and easing the modules path uses today, no longer.
- The placeholder rectangle that holds the slot while the image loads must
  match the final image's box exactly so there is zero layout shift between
  placeholder and loaded image.
- `prefers-reduced-motion: reduce` users get the loaded image with no
  transition (immediate opacity 1 once loaded), matching the rest of the
  product's reduced-motion behaviour.
- The fix is implemented by *reusing or extracting* the existing modules
  primitive, not by writing a parallel rack-only animation.
- The fallback tiles (`Preview unavailable`, `New rack`) keep their current
  visible behaviour but participate in the same fade pipeline so the
  failure path doesn't reintroduce a pop.

## Non-goals

- No backend changes. No Supabase RPC, schema, RLS, or migration work.
- No change to rack JPEG generation, sizing, compression, or storage —
  those belong in any future "rack preview pipeline" work, not here.
- No rewrite of `<app-rack-micro>` or `<app-rack-list>` layout.
- No card-level stagger redesign on `<app-rack-micro>` in the MVP layer;
  that is captured as a Polish layer item, optional, not required to close
  the user's report.
- No changes to `/modules` visual behaviour. The modules path is the
  reference implementation; we may *extract* it but must not regress its
  current feel.
- No new motion budget. Reuse the existing duration/easing already
  justified by the design language doc.

## Assumptions

- The modules path's perceived smoothness is acceptable as-is and is the
  ground truth the user wants to match. (If a future plan tightens the
  modules motion, the shared helper will move with it.)
- Rack JPEG previews will remain heavier than module panel images for the
  foreseeable future; the fix must therefore be load-event-driven, not
  purely time-based.
- `<img loading="lazy">` and `<img decoding="async">` semantics are
  acceptable on `/racks` today and should be preserved.
- No SSR/prerender contract change is needed; the fade must degrade
  gracefully when the image is already in the HTTP cache (no double flash).
- `lib-clean-card`'s existing `[@enter]` card stagger is correct and stays;
  any image-level fade must compose with it, not fight it.

## Dependencies and sequencing

- No upstream blockers.
- Standalone task. Can be picked up by `coordinator-loop` independently of
  the marketplace, manufacturer, or e2e workstreams.
- Soft adjacency: if implemented as a shared directive/wrapper, future plans
  ([`patch-svg-previews.md`](../patch-svg-previews.md),
  marketplace listings core, manufacturer hero) should adopt it instead of
  reinventing fades.

## MVP layer

Goal: close the user's report with the smallest correct change.

- [x] Add `(load)` + `(error)` bindings to the `<img>` in
  [`rack-image.component.html`](../../../../src/app/components/rack-parts/rack-image/rack-image.component.html).
- [x] Track an `imageLoaded` boolean on `RackImageComponent` (defaults `false`,
  reset to `false` in `syncFilename()` whenever the filename changes so a
  navigation between racks does not skip the fade).
- [x] On the `<img>`, apply `opacity: 0` until `imageLoaded` is `true`, then
  transition to `opacity: 1` over the same duration/easing the modules
  panel image uses (`725ms ease` — matches both `rack-image-fade-in`
  and the modules `@enter` today; no new motion budget required).
- [x] Render the existing placeholder geometry (the `.rackImage__frame` box and,
  for the empty/error fallbacks, the `.rack-image-fallback` tile) at the
  computed `maxHeight` *behind* the image so layout is reserved and the
  fade has something honest to reveal.
- [x] Replace (or supplement) the current `animate.enter="rack-image-enter"`
  CSS-enter binding on the `<img>` so the visual fade is driven by the
  load event, not by element insertion. The keyframe can stay for the
  fallback tiles, where there is no `(load)` event to wait for.
- [x] Respect `prefers-reduced-motion: reduce` — when active, skip the
  opacity transition and render the image immediately at `opacity: 1` once
  loaded. Use the same SCSS pattern other rack-area components already use
  (`@media (prefers-reduced-motion: reduce)` block in the component SCSS).

## Structural layer

Goal: make the fix reusable so we do not solve this twice.

- Extract the load-driven fade into a shared primitive in
  `src/app/shared-interproject/` — either:
  - **Option A — directive:** `[appImageFade]` on `<img>`, which
    internally manages `loaded`/`failed` state classes and the opacity
    transition. Pros: smallest API, drop-in on any existing `<img>`. Cons:
    placeholder geometry is still each surface's responsibility.
  - **Option B — wrapper component:** `<app-image-fade>` that takes
    `src`, `alt`, `loading`, `decoding`, and reserved
    `width/height/aspectRatio` and renders the `<img>` + placeholder
    together. Pros: enforces layout reservation. Cons: more invasive
    refactor on existing call sites.

  Default recommendation: **Option A directive** for the MVP rollout, with
  the wrapper component proposed if subsequent reuse surfaces (marketplace,
  patch SVG previews) prove the API is worth the lift.
- Refactor `<app-rack-image>` and `<app-module-part-image>` to use the
  shared primitive, so the motion is literally the same code path. Verify
  via the existing `module-part-image.component.spec.ts` that modules do
  not regress.
- Remove the now-redundant component-local fade animation from
  `<app-rack-image>` (keep the fallback-tile keyframe, since the fallback
  has no `(load)` to listen to).

## Polish layer

Goal: bring rack cards up to the modules card's level of composed entry.

- Add a media-slot stagger to `<app-rack-micro>` mirroring
  `<app-module-minimal>`'s `moduleDetailFadeEnter` /
  `moduleDetailInlineEnter` family — image first (~28ms delay), title
  next (~68ms), author/HP row (~96ms). Keep durations within
  the existing 150–200ms band. Strictly optional; the user's report does
  not require it.
- Audit the rest of the app for `<img>` tags that would benefit from the
  new directive (manufacturer logos, user avatars, patch thumbnails) and
  file follow-up TODO entries as needed; do not migrate them in this plan
  unless they sit on the same hot rack-list path.
- Consider a low-key shimmer for the placeholder rectangle when the image
  is taking >500ms to arrive, gated by `prefers-reduced-motion`. Only ship
  this if it actually helps perceived performance in a Playwright capture;
  Patcher's design language is explicit that decorative shimmers are not
  default.

## File / surface map

Primary edit surfaces (MVP + Structural):

- [`src/app/components/rack-parts/rack-image/rack-image.component.html`](../../../../src/app/components/rack-parts/rack-image/rack-image.component.html)
  — add `(load)`/`(error)`, conditional opacity class, drop reliance on
  `animate.enter` for the `<img>` (keep it for fallback tiles).
- [`src/app/components/rack-parts/rack-image/rack-image.component.ts`](../../../../src/app/components/rack-parts/rack-image/rack-image.component.ts)
  — `imageLoaded` flag, reset in `syncFilename`, `onImageLoad()` handler,
  CDR notify under OnPush.
- [`src/app/components/rack-parts/rack-image/rack-image.component.scss`](../../../../src/app/components/rack-parts/rack-image/rack-image.component.scss)
  — `.rackImage__frame img` initial `opacity: 0`, `.is-loaded`
  modifier → `opacity: 1` with the standard transition; `prefers-reduced-motion`
  guard.
- (Structural option A) `src/app/shared-interproject/directives/image-fade.directive.ts`
  + spec — new shared directive.
- [`src/app/components/module-parts/module-minimal/module-part-image/module-part-image.component.ts`](../../../../src/app/components/module-parts/module-minimal/module-part-image/module-part-image.component.ts)
  + [`module-part-image.component.html`](../../../../src/app/components/module-parts/module-minimal/module-part-image/module-part-image.component.html)
  — adopt the shared directive once extracted; remove the local `@enter`
  animation only if behaviour is byte-equivalent in tests.

Reference / read-only:

- [`src/app/components/rack-list/rack-list.component.html`](../../../../src/app/components/rack-list/rack-list.component.html)
- [`src/app/components/rack-micro/rack-micro.component.html`](../../../../src/app/components/rack-micro/rack-micro.component.html)
- [`src/app/components/module-parts/module-minimal/module-minimal.component.ts`](../../../../src/app/components/module-parts/module-minimal/module-minimal.component.ts)
  (motion vocabulary reference)
- [`src/app/style/commons_customizations.scss`](../../../../src/app/style/commons_customizations.scss)
  (the existing `.image-transition` class — verify whether it is still
  needed after the change; remove if orphaned).
- [`internaldocs/DESIGN_LANGUAGE.md`](../../../DESIGN_LANGUAGE.md) §Motion
  and Animation (constraints the implementation must satisfy).

Specs:

- [`src/app/components/rack-parts/rack-image/rack-image.component.spec.ts`](../../../../src/app/components/rack-parts/rack-image/rack-image.component.spec.ts)
  — extend with `imageLoaded` regression cases.
- (If directive extracted) `image-fade.directive.spec.ts` with state-class
  transitions.

## Acceptance criteria

- On `/racks`, when the page first paints, each rack card's preview image
  is invisible (opacity 0) until its bitmap loads, then fades to fully
  visible. No frame in which the image snaps from absent to opaque without
  transition (verified visually via `patcher-ui-debug` Playwright capture
  on a cold load).
- The placeholder geometry is identical to the final image's box, so no
  layout shift occurs between placeholder and loaded image (no CLS on the
  card).
- The motion duration and easing match the modules panel image fade. A
  visual side-by-side capture of `/modules` and `/racks` shows the same
  ease curve over the same time window.
- Reduced motion: with `prefers-reduced-motion: reduce` active, the rack
  image appears immediately once loaded, without an opacity transition,
  and without ever appearing before its bitmap is ready.
- The `(error)` path still shows the existing "Preview unavailable"
  fallback tile, and the stale-preview badge logic continues to work.
- The modules `/modules` page shows no visible regression in image enter
  feel (Polish-level smoothness is preserved or improved).
- `pnpm lint` passes; `pnpm test-headless --include="**/rack-image.component.spec.ts"`
  (and the equivalent for the modules spec / new directive spec, if added)
  passes.
- Component test asserts that the `<img>`'s loaded-state class is absent
  before `(load)` fires and present afterwards, and that the
  `imageLoaded` flag resets when `data.image` changes (e.g. navigation
  between two different racks reuses the component).

## Validation strategy

- **Unit / component spec:**
  - Extend `rack-image.component.spec.ts` to trigger `onImageLoad()` and
    verify the loaded-state class toggles, that `syncFilename()` resets it
    when the filename changes, and that the error path leaves
    `imageLoaded` false. If a shared directive is extracted, mirror these
    in `image-fade.directive.spec.ts`.
- **Visual regression with Playwright / `patcher-ui-debug`:**
  - Per `AGENTS.md` §11 / `internaldocs/DESIGN_LANGUAGE.md`, capture
    `/racks` (cold cache, throttled network if feasible) and `/modules`
    side by side. Confirm the image fade visibly behaves the same. Save
    the screenshots as evidence in the PR description.
  - Capture the rack list with `prefers-reduced-motion: reduce` set in
    Playwright and confirm the image appears without transition.
- **Manual smoke on the live dev server (`pnpm start`):**
  - Load `/racks` cold (DevTools "Disable cache"), scroll once, navigate
    into a rack detail and back, and confirm no abrupt pop.
  - Force a 404 on one preview (DevTools request blocker on a single
    filename) and confirm the fallback tile still appears smoothly.
- **Cross-surface check:**
  - Spot-check rack previews wherever `<app-rack-image>` is used
    (profile racks, patch detail rack context if present, rack editor).
    The fix should be uniform.
- **No e2e additions required** unless a visual snapshot test
  infrastructure already exists for `/racks`. If not, do not add one as
  part of this plan.

## Risks and open questions

- **Cache hits:** if the browser already has the JPEG in cache, the
  `(load)` event may fire before the next CDR cycle. The implementation
  must handle that without flashing opacity 0 → 1 (use `complete`
  property on `HTMLImageElement` as a synchronous shortcut, or fire the
  handler from `ngAfterViewInit` if `img.complete` is true). Confirm with
  the unit spec.
- **OnPush + load events:** `<img>`'s native `load` event does not run
  Angular zones in some configurations; the handler must call
  `ChangeDetectorRef.detectChanges()` or use a template event binding
  (which already triggers CD).
- **Extracting now vs. later:** Option A directive is cheap, but if the
  marketplace / patch SVG previews end up needing the wrapper-component
  variant, we'll wish we'd built that first. Decision left to the
  implementer; if undecided, ship MVP in-component and file a follow-up.
- **Behavioural drift in `/modules`:** if `<app-module-part-image>` is
  refactored onto the shared primitive, the existing `@enter` trigger may
  no longer fire. Verify the visual feel is preserved (Playwright
  snapshot diff) before deleting the old trigger.
- **Fallback tiles:** the "Preview unavailable" and "New rack" tiles
  currently rely on `animate.enter="rack-image-enter"`. They have no
  `(load)` to wait for, so the keyframe enter must stay for them.
- **SSR / prerender:** SSR likely renders the `<img>` with the cached
  filename already; verify there is no visible double-fade after
  hydration. Out of scope to add SSR-specific code paths beyond what
  already exists.
- **Open question:** should the placeholder be neutral grey
  (`rgba(0,0,0,0.06)`, matching the existing fallback) or use a
  desaturated rack silhouette? Default to neutral grey for honesty;
  revisit only if the Polish layer is taken.

## Coordinator-loop handoff

This plan is ready for `coordinator-loop` to pick up as a single self-contained
backlog item.

- **Priority:** `MEDIUM`. Polish regression on a visible core surface, no
  blocker on commerce/data work, fixes once + benefits multiple future
  surfaces.
- **TODO section:** `INFRA (independent; pick any time a product task is
  blocked)` — keeps it adjacent to the other UI/regression bug entries.
- **Recommended persona pipeline:**
  - `frontend-dev` for implementation (rack-image MVP + optional shared
    directive extraction).
  - `designer` to validate motion match against `/modules` and against
    `DESIGN_LANGUAGE.md` §Motion (Playwright captures required).
  - `code-review` persona to confirm no `/modules` regression and that the
    extracted primitive (if any) belongs in `shared-interproject/` per
    `AGENTS.md` §4 layering rules.
- **Branch hint:** `bug/rack-list-image-fade-load`.
- **Validation gates the loop should require before commit:**
  - `pnpm lint`
  - `pnpm test-headless --include="**/rack-image.component.spec.ts"`
    (+ modules spec if touched, + new directive spec if added)
  - `patcher-ui-debug` Playwright snapshot of `/racks` and `/modules`
    attached to the PR description
  - `node scripts/checks/check-docs.cjs`
- **Out-of-scope guardrails:**
  - No backend, RLS, or schema edits.
  - No motion changes outside the image-load fade primitive.
  - No mass `<img>` migration to the new directive in the same PR —
    file follow-ups instead.

## Decision log

- 2026-06-18 — Plan created by `feature-notetaker` from user report:
  *"rack images in slash racks load abruptly. I want them loading nicely
  with an animation exactly like we do in slash modules for panels."*
  Confirmed via code reading that `<app-rack-image>` already has an
  `animate.enter` keyframe but no `(load)`-driven gating, while
  `<app-module-part-image>` is shielded by both an Angular `@enter`
  trigger and the parent `<app-module-minimal>`'s staged
  `moduleDetailFadeEnter` family. Diagnosed the visible difference as
  load-event-driven fade vs. time-based fade on a heavier asset. Chose
  reuse/extraction over a parallel rack-only animation per
  `DESIGN_LANGUAGE.md` "one motion grammar" guidance. Priority set to
  MEDIUM (polish on a load-bearing public surface, no blocker).
- 2026-06-18T17:54+02:00 — Loop 5 executor shipped the scoped MVP in
  `RackImageComponent` instead of extracting `[appImageFade]`. This keeps
  `/modules` untouched, follows the handoff preference for an in-component
  fix, and still preserves the shared motion grammar (`725ms ease`) plus
  reduced-motion behavior.

- 2026-06-18T18:02+02:00 — Reviewer caught that opacity-only loading still allowed preview-frame collapse before intrinsic image dimensions arrived; the final MVP reserves frame height with the same rack image geometry before fading the bitmap on `load`.
