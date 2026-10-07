# Homepage marketing rebuild — explain Patcher in one scroll

<!-- Section: PRODUCT (logged-out acquisition surface) -->

Goal: replace the live-component showcase homepage with a focused, polished marketing page that tells a first-time
visitor what Patcher is, why it beats their current tool (especially ModularGrid), and what to click next.

Status: Active on `develop`, frontend-only. No schema/migration/RLS/RPC change. No production/release/push.

## Problem (why rebuild)

- The current page embeds three full live detail views (patch, module, rack) inside device frames. They are heavy
  (three extra data loads + full detail trees), visually dense, and read as "the app" rather than an explanation.
  First-time visitors have to decode UI before they learn what the product does.
- No competitive framing: most Eurorack visitors already use ModularGrid. The page never tells them they can bring
  their racks over, or what they gain by doing so. That answer is buried in the FAQ.
- Seven stacked sections (showcase ×3, insights bridge, snapshot, trends, principles, workflow rail, CTA) repeat the
  same three ideas with different card styles; principles and workflow copy are generic.
- Decorative radial-gradient + grid background and per-card gradients contradict `DESIGN_LANGUAGE.md`
  ("gradients for visual interest" is an anti-pattern).

## Positioning

- Audience: Eurorack musicians, most of whom already plan racks on ModularGrid.
- One-line promise (kept, owner likes it): **"Your operating system for everything modular."**
- Wedge vs ModularGrid: Patcher does what a rack planner does **and** treats patches as first-class documents
  (cable graph, numbered copies of the same module, notes, auto-save). It is free for everyone with no tiers, open
  source (AGPL-3.0), has an open data API, and imports ModularGrid rack JSON.
- Claims about ModularGrid are limited to what our own FAQ already states (rack JSON export needs a Unicorn
  account). Everything else is phrased as what Patcher does, never as what ModularGrid lacks.

## Information architecture (top → bottom)

1. **Hero** — eyebrow (free · open source · Eurorack), kept H1, one-sentence lede, primary CTA (Get started free /
   Open your workspace when signed in), secondary link (Browse modules), switcher hook link ("Coming from
   ModularGrid?"). Right side keeps the live patch graph inside an instrument-style frame with a caption.
2. **Proof strip** — live counts (modules, manufacturers, racks planned, €0) from `ApplicationStatisticsService`.
3. **System tour** — tabbed "Library / Racks / Patches" showcase: one headline, three specific bullets, and an
   art-directed product screenshot per tab (light + dark captures). Replaces the three live device frames, the
   principles cards, and the workflow rail.
4. **Switch section** (`#switch`) — "Coming from ModularGrid?": three-step import + "what you get here" list + CTA.
5. **Community** — existing Most owned / Most wanted discovery rail, restyled header.
6. **Built in the open** — free for everyone, open source, open data API, community-maintained catalogue.
7. **Final CTA** — single closing statement + primary/secondary actions.
   (Shell FAQ + footer follow, unchanged.)

## Layer 1 — MVP (new IA + copy, live previews removed)

- [ ] New `HomeComponent` template/SCSS with the seven sections above on theme tokens (no decorative gradients)
- [ ] Hero rewrite: kept headline, new lede/CTAs, patch graph in framed panel with caption
- [ ] Proof strip component bound to live statistics (graceful when stats fail/empty)
- [ ] System tour component (accessible tablist) using existing major-area screenshots as interim images
- [ ] ModularGrid switch section, open section, final CTA components
- [ ] Remove the three live detail previews and their delayed data loads from `HomeComponent`
- [ ] Unit specs updated/added; `pnpm lint` + targeted tests green

## Layer 2 — Structural (assets, auth awareness, cleanup)

- [ ] Fresh art-directed screenshots (module / rack / patch detail) in light and dark, WebP, theme-switched
- [ ] Auth-aware CTAs (signed-in users get workspace links instead of sign-up)
- [ ] Analytics: `home.cta_clicked` with `{cta, location}` per `patterns/ANALYTICS.md`
- [ ] Delete dead home components (proof-showcase, workflow-rail, curiosity-bridge, founder-note, insights-section,
      open-principles/invitation-cta if superseded) + their specs + dead `theme-dark.scss` overrides
- [ ] SEO title/description refreshed; e2e `home.spec.ts` updated to the new sections

## Layer 3 — Polish

- [ ] Responsive pass: 360, 768 portrait, 1024 landscape, 1280, 1920 — light and dark, screenshot every iteration
- [ ] A11y: tablist keyboard (arrow/Home/End), focus-visible rings, reduced-motion, heading order, alt text
- [ ] Copy pass for AI-sounding phrasing; every claim cross-checked against code/flags
- [ ] Final before/after screenshot set reviewed

## Decision log

- 2026-10-07: Owner asked in-session for a full professional homepage rebuild, planned and executed in layers on
  `develop`; that request is the UX placement approval required by AGENTS.md §5 for this surface.
- 2026-10-07: Live embedded detail views dropped in favour of static, art-directed screenshots. Rationale: they
  confused first-time visitors and cost three extra detail loads. The live patch graph stays in the hero (owner likes
  it; it is the single "this is real" moment and is cheap).
- 2026-10-07: Competitive copy names ModularGrid only in the switch section and only states facts already in our FAQ
  (JSON export needs Unicorn). No comparison table: we cannot verify competitor feature claims and they rot.
- 2026-10-07: Fabricated-looking `userStories` testimonials (unused in template) are deleted, not surfaced. No
  testimonials until real, attributable ones exist.
- 2026-10-07: Marketplace / collections / cool reactions are flag-gated off in production, so the page does not
  advertise them. The discovery rail's "Most sold" tab follows the existing marketplace flag.
- 2026-10-07: Proof strip shows exact grouped figures (lab-grade honesty) rather than rounded "10k+" marketing
  numbers; patch count is not featured (small relative number, would undersell).

## Documentation impact

- Classification: public-visual
- Production visibility: immediate on next release
- Public docs paths: README hero image (`documentation/readme-assets/homepage-hero-graph.jpg`), docs-site homepage
  screenshots (queue after production publication)
- Screenshot targets: `/home` desktop + mobile, light + dark
- Changelog summary: "Redesigned homepage: clearer story, ModularGrid import front and centre, lighter page."
