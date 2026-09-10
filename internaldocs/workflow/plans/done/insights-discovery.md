# Insights → Discovery rework

Frontend-only rework of the Insights page toward a "help me find modules" discovery voice.
No backend / RPC / migration / RLS / route changes in any layer.

## Decision log

- Optimize for "help me find modules"; hide Takeaway:/Method: labels behind one collapsed "How we count" toggle.
- Layer 1 reuses the existing payload as-is (no mapper changes); `activityChips` stays in the VM but is no longer rendered.
- Fresh + 30-day activity merge: keep chart + legend + updated-badge; momentum grid and chips card replaced by one summary line built from `page.activityChart.legend` in the template.
- `activityTakeaway` is no longer rendered after the merge; its numbers survive in the legend summary line.
- Footprint + makers CTA rows deleted (their targets duplicate Fresh/Library); Fresh trimmed to Browse racks + Browse patches.
- Bucket keys unchanged (`mostOwned`/`mostWanted`/`mostSold`); only display labels and count nouns renamed.
- Layer 2 renders already-computed but hidden `page$` fields only — no mapper, RPC, or type changes. HP size buckets condense `hpBandBars` in the component (label-prefix match on `0-2/3-5` + `17-28/29+`, positional first2/middle/last2 fallback).
- `Makers in motion` replaced by `Makers to explore`: Most-collected (`topManufacturerBars` ≤ 5) + Heating up (`activeManufacturerBars` ≤ 5), `makersTakeaway` shown once, single Browse modules CTA (`makers_browse_modules`).
- Fresh card gains a freshness-cohort strip from the first two `moduleFreshnessBars`; Library card loses its Browse CTA (hero covers it) and gains a one-line sharing-mix starter teaser (skipped when `sharingMix` is empty); Private footprint untouched.
- Podium treatment for the hero ranking deferred (rails first); discovery card order set to Fresh → Makers → Format → Size → Library → Private.
- Layer 3 podium is SCSS-only (`:first-child` span 2 + larger rank badge, `@media (min-width: 48rem)`); mobile stays single-column, no template change, no animation added so `prefers-reduced-motion` needs no override.
- Snap-scroll skipped: the hero grid already reflows via auto-fill and snap would fight it; rails readability comes from a `metric-bars` gap bump instead. Metric-bar rows are non-interactive display rows (`role="img"`, no click targets), so no 44px touch-target rule applies.
- Dead Layer 1–2 SCSS removed after grep-verified zero template references: `.method-note`, `.activity-chips`, `.insight-chip__label` (page-level copy; the standalone chip component keeps its own), `.trend-momentum-*` + their media-query overrides.
- Empty-state voice is playful but direct; suppression semantics unchanged (Top-6 buckets minimum count 1, makers/format/size/fresh strips render existing-data guards only). Fresh strip gains an `@else` empty note since it previously rendered nothing when `moduleFreshnessBars` was empty.
- SEO reframed to discovery (`Discover modules` title + app area, new description, same URL).
- Discovery-rail analytics: new `trackDiscoveryRailClicked` → `insights.discovery_rail_clicked`; existing event names untouched. Wired only to the Makers card Browse CTA alongside the retained `makers_browse_modules` support event — the one natural CTA click-point on the Layer-2 rails (maker rows and metric bars are not links; firing both events there would double-count one gesture under two names). Kept as two explicit calls rather than folding into one event so support-link history stays comparable.

## Layer 1 — MVP (done)

- [x] De-labeled takeaway headlines (same strings, no Takeaway:/Method: prefixes)
- [x] Single collapsed "How we count" details block, per-card notes removed
- [x] Fresh + 30-day activity merged into one "Fresh this month" card with legend summary line
- [x] Bucket rename (labels + count nouns, fallbacks updated)
- [x] CTA trim (9 → 4 buttons, analytics targets unchanged for retained buttons)
- [x] Specs + lint green

## Layer 2 — Structural (done)

- [x] Maker spotlight card (Makers to explore, replaces Makers in motion)
- [x] Format finder card (What fits your case?)
- [x] Size guide card (What size?, component-side HP buckets + median line)
- [x] Fresh drops strip inside the Fresh card
- [x] Library CTA removed (CTA discipline), snapshot cards kept
- [x] Starter-path teaser on the Library card
- [x] Specs + lint green

## Layer 3 — Polish (done)

- [x] Hero podium: rank-1 card spans 2 cols on desktop + larger rank badge (SCSS-only, mobile single-column)
- [x] Rails readability: metric-bars gap bump, dead Layer 1–2 SCSS removed (snap-scroll skipped, documented)
- [x] Empty-state discovery voice (hero/makers/fresh/format/size, suppression semantics unchanged)
- [x] SEO discovery framing (title/description/app area, same URL)
- [x] Discovery-rail analytics (`insights.discovery_rail_clicked`, makers CTA wired alongside support event)
- [x] Specs + lint green
