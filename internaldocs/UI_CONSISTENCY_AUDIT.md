# UI Consistency Audit

Read-only review of Patcher's UI consistency across the application surface.

## Objective

Increase overall perceived quality during use by identifying visual and interaction inconsistencies between sections, without
changing product code in this pass.

## Scope

This audit covered public, authenticated, and shared-shell surfaces, including:

- app shell, toolbar, footer, FAQ, event banner, discovery tips, selection panel
- home and public marketing/browse surfaces
- modules, patches, racks, manufacturer, public profile, info pages
- login and user/account-adjacent surfaces
- authenticated collection and editing-adjacent surfaces

## 20 passes completed

| Pass | Lens | Result |
|---|---|---|
| 1 | App shell and global chrome | Strong shell structure, but shell surfaces use different visual languages |
| 2 | Typography hierarchy | Good headline system, but public vs shared surfaces diverge in scale discipline |
| 3 | Spacing rhythm and density | Biggest global inconsistency; utilities exist, but many custom values bypass them |
| 4 | Buttons and primary CTAs | Core CTA language is good, but button systems are mixed |
| 5 | Links and inline actions | External and inline link treatment varies too much by section |
| 6 | Form field treatment | Auth forms are generally coherent; density and appearance rules are not centralized |
| 7 | Cards, panels, and containers | Strong card usage overall, but padding/radius conventions drift by feature |
| 8 | Iconography and icon-label pairing | Shared primitives are solid, but icon sizing still varies by component |
| 9 | Empty, loading, and skeleton states | Good base patterns, but loading language differs across sections |
| 10 | Status, feedback, and helper messaging | Messaging exists in most flows, but tone and delivery are not fully standardized |
| 11 | Navigation and route-entry clarity | Top-level navigation is clear; secondary entry points vary in clarity |
| 12 | Home and marketing/public landing consistency | Home is polished, but visually more bespoke than the rest of the app |
| 13 | Browsers/lists consistency | Modules, patches, and racks are the most internally consistent cluster |
| 14 | Detail page consistency | Detail pages share core structure, but spacing and CTA treatment differ |
| 15 | Editing workflow consistency | Authenticated edit surfaces feel fragmented compared with rack editing |
| 16 | Auth/account/user-area consistency | User-area is capable, but its floating/search patterns diverge from other surfaces |
| 17 | Footer/help/documentation consistency | Helpful, but footer/help surfaces feel stylistically separate from the product core |
| 18 | Responsive/tablet/touch consistency | Good intent exists, but touch-aware behavior is strongest in only a subset of flows |
| 19 | Motion and visual calm consistency | Motion is often tasteful, but durations and overlay styles are not normalized |
| 20 | Cross-surface terminology/copy consistency | Product language is mostly coherent, but CTA and helper phrasing still drift |

## Overall assessment

Patcher already has a **strong structural UI foundation**:

- the app shell is readable and route-oriented
- module / patch / rack browsers share a clear mental model
- the home page is visually polished and modern
- shared button, hero-card, list, and icon-button primitives are doing real work

The biggest consistency issue is **not missing design effort**. It is **local divergence from shared patterns**:

1. spacing values drift away from the utility scale
2. floating surfaces use separate visual languages
3. button/link/form treatments vary across sections
4. loading/motion conventions are good in places but not systematized

## What already feels strong

### 1. Browser family consistency

The modules, patches, and racks browser roots are the clearest example of a stable product pattern:

- `src/app/features/module-browser/module-browser-root/module-browser-root.component.html`
- `src/app/features/patch-browser/patch-browser-root/patch-browser-root.component.html`
- `src/app/features/routes/rack/rack-browser-root/rack-browser-root.component.html`

They share:

- the same `lib-hero-content-card` framing
- the same sidebar/results split
- the same paginator placement
- the same filter heading/reset mental model

This cluster feels like the most reusable visual language in the app.

### 2. Shared shell clarity

The app shell in `src/app/app.component.html` is straightforward and legible:

- toolbar
- event banner
- route loading
- page content
- FAQ
- footer
- global floating helpers

That ordering gives the app a stable frame during navigation.

### 3. Good icon-button groundwork

`src/app/style/commons_customizations.scss` establishes a solid baseline for icon buttons and menu-item icon alignment. That
shared work likely prevents more inconsistency than users notice.

### 4. Home page polish

The home surface is high quality and feels intentionally designed. Typography, pacing, hierarchy, and screenshot framing are
more refined than many other sections.

That is a strength, but it also raises the bar the rest of the app does not always meet.

## Surface snapshot

| Surface | Consistency snapshot | Notes |
|---|---|---|
| Home | Strong but bespoke | Most polished visual surface; risks becoming its own style system |
| Module / patch / rack browsers | Strong | Best cross-feature consistency in layout and interaction model |
| Detail pages | Moderate | Shared structure exists, but CTA/link/spacing treatment drifts |
| Public profile | Strong-to-moderate | Good card composition, but link and stats treatment feel locally tuned |
| Login / signup / reset | Moderate | Clear and usable, but slightly separate from the rest of the product language |
| User area | Moderate | Powerful and coherent, but denser and more overlay-heavy than adjacent surfaces |
| Editing overlays | Mixed | Functional, but not unified visually or behaviorally |
| Footer / FAQ / help | Moderate-to-weak | Useful, but stylistically detached from the core browse/detail system |
| Info pages | Mixed | Present, but not yet as cohesive as core product surfaces |

## Five refinement passes

These passes were applied after the first draft to make the audit more precise and more execution-ready.

### Refinement pass 1 — Coverage gap fill

I revisited surfaces that were underrepresented in the initial sweep:

- manufacturer detail
- application insights
- changelog
- FAQ
- event banner

This confirmed two important points:

1. **Manufacturer detail** is structurally sound but uses a more local button/FAB style than the main browser family.
2. **Info pages are inconsistent with each other**: the insights page is clearly designed, while the changelog page source is
   effectively empty and therefore contributes to a fragmented "documentation/info" feel.

Relevant files:

- `src/app/features/manufacturer-detail/manufacturer-detail.component.html`
- `src/app/features/manufacturer-detail/manufacturer-detail.component.scss`
- `src/app/features/info-pages/application-insights/application-insights-page.component.html`
- `src/app/features/info-pages/changelog/changelog.component.html`
- `src/app/shared-interproject/components/@visual/faq/faq.component.html`

### Refinement pass 2 — Severity calibration

To avoid over-reporting, the audit was recalibrated using two questions:

1. Does this inconsistency appear across many surfaces?
2. Does it materially affect perceived quality during ordinary use?

That is why the following remained the highest-value issues:

- spacing/density drift
- floating surface divergence
- button/link hierarchy drift
- loading/motion inconsistency
- authenticated editing inconsistency

And why the following stayed moderate rather than high:

- copy drift
- radius variation
- typography unevenness outside the home surface

### Refinement pass 3 — Section contrast

The clearest contrast after refinement is:

- **browse surfaces are the most system-like**
- **home is the most polished**
- **authenticated work surfaces are the most fragmented**
- **help/info surfaces are the most detached**

This matters because it suggests the app does **not** need a full redesign. It needs stronger cross-surface enforcement of the
patterns that already work best in the browser family.

### Refinement pass 4 — Do-not-regress strengths

The audit now explicitly preserves the parts of the UI that should not be diluted during future cleanup:

1. The sidebar/results mental model in modules, patches, and racks
2. The shell clarity established by toolbar + route content + footer/help framing
3. The high polish and hierarchy quality of the home surface
4. The shared icon-button groundwork in global style customizations

Consistency work should make more surfaces feel like these strengths, not flatten them.

### Refinement pass 5 — Execution framing

The document now has a more explicit rollout order so future work can be sequenced cleanly:

1. spacing + density
2. button/link hierarchy
3. floating surface language
4. loading + motion language
5. authenticated editing cleanup

That order should produce the most visible quality gain with the least churn.

## High-value inconsistencies

### 1. Spacing system exists, but the product does not fully obey it

**Why it matters:** this is the single biggest source of "almost consistent, but not quite" feeling.

The style guide points teams toward layout utilities and gap classes, but many surfaces still use bespoke values:

- custom gaps and paddings in home-related components
- non-scale paddings in the event banner
- per-component card/panel padding values across auth, shell, and help surfaces

Relevant files:

- `src/app/style/tools.scss`
- `src/app/features/backbone/home/home.component.scss`
- `src/app/features/backbone/home/components/home-open-principles/home-open-principles.component.scss`
- `src/app/features/backbone/home/components/home-workflow-rail/home-workflow-rail.component.scss`
- `src/app/features/backbone/event-banner/event-banner.component.scss`

**Consistency impact:** the app has a system, but users experience a mix of systemized and one-off spacing rhythms.

### 2. Floating surfaces are visually disconnected from each other

Three important floating surfaces each use a distinct treatment:

- selection panel: green-tinted, compact, low-radius, utility-like
- discovery tip: warm/beige, rounded, editorial, heavier blur
- user-area floating search: translucent white utility tray

Relevant files:

- `src/app/components/patch-parts/selection-panel-outlet/selection-panel-outlet.component.scss`
- `src/app/shared-interproject/discovery-tips/discovery-tip-surface/discovery-tip-surface.component.scss`
- `src/app/features/routes/user-area/user-area-root/user-area-root.component.scss`

**Consistency impact:** each overlay works in isolation, but together they do not feel like the same product family.

### 3. Buttons and links use too many visual idioms

Examples:

- brand buttons on home and public profile
- `mat-stroked-button` reset actions in browsers
- bespoke pill toggle button in module browser
- FAB submit CTA in module browser
- dotted footer links
- profile website rendered as a styled inline link

Relevant files:

- `src/app/features/module-browser/module-browser-root/module-browser-root.component.html`
- `src/app/features/module-browser/module-browser-root/module-browser-root.component.scss`
- `src/app/features/routes/public-profile/public-profile.component.html`
- `src/app/features/backbone/footer/footer.component.scss`

**Consistency impact:** the product does not yet have a single clear hierarchy for "primary action", "secondary action",
"utility action", and "plain navigation link".

### 4. Loading states are functional, but not unified enough

There are several good loading primitives, but they do not always communicate the same way:

- route-level loading bar in app shell
- skeleton-based loading surfaces
- update/loading indicators in list pages
- "Graph loading..." states inside specialized experiences

Relevant files:

- `src/app/app.component.html`
- `src/app/features/patch-browser/patch-browser-root/patch-browser-root.component.html`
- `src/app/features/module-browser/module-browser-root/module-browser-root.component.html`
- `src/app/shared-interproject/components/@visual/graph-view/graph.component.html`

**Consistency impact:** users get different loading vocabularies depending on where they are, rather than one calm, repeated
language.

### 5. Authenticated editing UX is less unified than the browsing UX

Rack-oriented editing appears to have the strongest touch-aware and floating-panel thinking, while other editing/auth flows use
different patterns.

Relevant files noted during review:

- `src/app/components/patch-parts/selection-panel-outlet/selection-panel-outlet.component.scss`
- `src/app/features/routes/user-area/user-area-root/user-area-root.component.html`
- `src/app/features/backbone/login/login-page/login-page.component.html`
- authenticated UI findings across patch/module/rack editing flows

**Consistency impact:** signed-in workflows feel more feature-accumulated and less design-system-coordinated than public browse
surfaces.

### 6. Footer/help/info surfaces feel separate from the main product UI

The footer is useful but stylistically distinct:

- dotted link styling
- different visual density
- different link semantics than most in-app surfaces

FAQ and info pages are valuable, but they do not always inherit the same level of hierarchy/CTA coherence as core product
surfaces.

Relevant files:

- `src/app/features/backbone/footer/footer.component.html`
- `src/app/features/backbone/footer/footer.component.scss`
- `src/app/shared-interproject/components/@visual/faq/faq.component.html`
- `src/app/shared-interproject/components/@visual/faq/faq.component.scss`
- `src/app/features/info-pages/info-pages.module.ts`

## Moderate inconsistencies

### 1. Typography is good, but not equally disciplined everywhere

The home page has a more sophisticated hierarchy than many other surfaces. That makes the rest of the app feel flatter by
comparison, even when the components are technically fine.

### 2. Border radius values drift

Multiple radius families appear across shell, overlays, and home subcomponents. The result is subtle but cumulative.

### 3. Motion durations and easing are not tokenized enough

Common durations include roughly 120ms, 150ms, 180ms, 200ms, 220ms, and longer feature-specific timings. Motion often looks
good, but it does not yet feel intentionally standardized.

### 4. Touch-aware behavior is uneven

Some surfaces show clear tablet/touch thinking, especially around floating controls, while others still rely more heavily on
desktop assumptions.

### 5. Copy and CTA phrasing drift between sections

Examples include variations in:

- browse vs discover vs explore
- dashboard vs account vs area
- submit vs add vs manage

The differences are not severe, but they reduce product-level cohesion.

## Pass-by-pass notes

### Pass 1 — App shell and global chrome

Strong shell structure. The toolbar is polished and readable, but shell-adjacent surfaces (event banner, footer, FAQ) each
introduce their own visual dialect.

### Pass 2 — Typography hierarchy

Headline hierarchy is strongest on home and hero-card-based views. Smaller shell/help surfaces vary more in small-label,
eyebrow, and helper text treatment.

### Pass 3 — Spacing rhythm and density

This is the main systemic inconsistency. Shared gap utilities exist, but custom rem values are common enough to soften the sense
of one design grid.

### Pass 4 — Buttons and primary CTA treatment

Primary CTAs are generally understandable, but the app uses multiple button idioms where a tighter system would improve scan
speed.

### Pass 5 — Links and inline actions

External and inline links need clearer hierarchy rules. Footer links especially feel unlike the rest of the app.

### Pass 6 — Form field treatment

Auth forms are generally coherent and readable. The issue is not poor quality, but localized density overrides and mixed button
systems around them.

### Pass 7 — Cards, panels, and containers

Card usage is widespread and mostly good. Padding, radius, and density need a stronger shared scale.

### Pass 8 — Iconography and icon+label pairing

The base primitives are strong, but icon sizing and opacity treatment still vary at the component level more than they should.

### Pass 9 — Empty, loading, and skeleton states

There is a healthy set of patterns already, but they do not yet feel like one standardized family.

### Pass 10 — Status, feedback, and helper messaging

Functional coverage is good. Tone and prominence differ between shell, auth, and feature-local states.

### Pass 11 — Navigation and route-entry clarity

Top-level navigation is clear. Secondary entry points like docs/help/profile/account are useful but not always equally framed.

### Pass 12 — Home and marketing/public landing consistency

Home is visually strongest, but also most bespoke. It risks feeling like the design target rather than one member of a unified
system.

### Pass 13 — Browsers/lists consistency

This is the most consistent family in the app.

### Pass 14 — Detail page consistency

Detail pages share broad structure, but spacing, CTA treatment, and supporting surfaces still vary.

### Pass 15 — Editing workflow consistency

Edit-oriented surfaces need more cross-product unification than browse-oriented surfaces.

### Pass 16 — Auth/account/user-area consistency

The user area is capable and dense, but its floating search and panel behavior do not fully align with other overlays.

### Pass 17 — Footer/help/documentation consistency

Useful but stylistically separate from core browse/detail surfaces.

### Pass 18 — Responsive/tablet/touch consistency

There is clear awareness of touch/tablet needs, but the execution is stronger in some areas than others.

### Pass 19 — Motion and visual calm consistency

Mostly calm and tasteful. Standardizing motion tokens would make the app feel more intentional and mature.

### Pass 20 — Cross-surface terminology/copy consistency

No major copy crisis, but repeated small drifts create friction in the product voice.

## Priority follow-up themes

These are the highest-value follow-up areas if the goal is **overall perceived quality through consistency alone**.

### Priority 1 — Establish a real spacing/density system

Turn the existing utility philosophy into an actually enforced product-wide standard.

### Priority 2 — Unify floating surface language

Selection panel, discovery tips, floating search, and similar overlays should feel related.

### Priority 3 — Define interaction hierarchy

Clarify when to use:

- brand primary button
- material stroked/text button
- FAB
- plain link
- inline utility action

### Priority 4 — Normalize motion and loading states

Standardize motion timing, easing, and loading vocabulary across shell, browse, detail, and edit surfaces.

### Priority 5 — Bring authenticated editing flows up to the same consistency level as the browser family

The public browse surfaces currently feel more design-system-cohesive than the signed-in working surfaces.

## Quick scoring snapshot

This is not a product-health score. It is a consistency score only.

| Area | Consistency score | Read |
|---|---|---|
| Home | 4.5 / 5 | High quality, but visually more bespoke than the rest |
| Module / patch / rack browsers | 4.5 / 5 | Best systemic consistency in the app |
| Detail surfaces | 3.5 / 5 | Good structure, moderate drift in action/spacing treatment |
| User area | 3.5 / 5 | Strong utility, moderate divergence in floating/search behavior |
| Auth pages | 3 / 5 | Clear and usable, but slightly separate from broader UI language |
| Editing overlays | 3 / 5 | Functional, but not visually unified |
| Footer / FAQ / info | 2.5 / 5 | Helpful, but least aligned with the core product system |

## Suggested rollout order

If this audit becomes execution work later, the cleanest order is:

1. **Spacing + radius tokens** — highest leverage, lowest conceptual risk.
2. **Button / link hierarchy** — makes the app feel immediately more coherent.
3. **Floating surface language** — aligns the most visibly divergent overlays.
4. **Loading + motion system** — improves polish and calmness across all routes.
5. **Authenticated editing cleanup** — brings advanced workflows up to the consistency level of the public browsers.

## Final conclusion

Patcher does **not** have a weak UI. It has a **good UI with uneven system enforcement**.

The strongest impression today is:

- **high care**
- **good component craft**
- **good product intuition**
- but **too many local exceptions**

If the next consistency pass focuses only on spacing, floating surfaces, button/link hierarchy, and loading/motion language,
the app's overall perceived quality should improve materially without requiring a major redesign.
