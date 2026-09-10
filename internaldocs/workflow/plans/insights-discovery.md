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

## Layer 3 — Polish (planned)

- [ ] Responsive and motion polish for the merged Fresh card
- [ ] Final copy and a11y review of the discovery voice
