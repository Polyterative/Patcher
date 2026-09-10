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

## Layer 1 — MVP (done)

- [x] De-labeled takeaway headlines (same strings, no Takeaway:/Method: prefixes)
- [x] Single collapsed "How we count" details block, per-card notes removed
- [x] Fresh + 30-day activity merged into one "Fresh this month" card with legend summary line
- [x] Bucket rename (labels + count nouns, fallbacks updated)
- [x] CTA trim (9 → 4 buttons, analytics targets unchanged for retained buttons)
- [x] Specs + lint green

## Layer 2 — Structural (planned)

- [ ] Podium treatment for the hero ranking (deferred from Layer 1)
- [ ] Discovery-oriented card ordering and hierarchy pass

## Layer 3 — Polish (planned)

- [ ] Responsive and motion polish for the merged Fresh card
- [ ] Final copy and a11y review of the discovery voice
