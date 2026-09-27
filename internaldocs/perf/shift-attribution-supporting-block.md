# Shift attribution — supporting-block transient owns systemic CLS

Dated addendum to the [top-offender report](./top-offender-report.md), recorded
2026-09-27 on the clean `develop` tree (no code change; investigation round per
the [loop contract](../testing/PERFORMANCE.md#rollback-rules-loop-contract)).
Post: `https://github.com/Polyterative/Patcher/issues/150#issuecomment-5848361007`.

## Correction to standing state

The runbook standing state says systemic CLS is content-driven with H4 (DOM) and
H7 (images) owning it. Shift-attribution via `layout-shift` sources refutes that
on all three probed content flows: **94–99% of each flow's CLS score comes from
the shell supporting block** (`.app-shell__supporting--help`: FAQ + footer),
not from page content, images, or fonts. H4/H7 own no share of this score.

## Method

Throwaway Playwright probe (Chromium, viewport 1440x900, dev server `:5556`,
8s settle from navigation start, clean tree): record `layout-shift` entries with
per-source selectors and previous/current rects, sum values, compare against the
committed baselines. Probes removed after the run (gitignored `tmp/`, never
committed). A second probe verified final DOM state after settle.

## Results (probe totals reproduce committed baselines to 4dp)

| flow | probe total | committed baseline | top shift(s) | supporting-block share |
|---|---|---|---|---|
| browser `/modules/browser` | 0.6451 | 0.6451 ([baseline](./baselines/browser.json)) | v=0.6446 @t=205ms: supporting 1440x454 → 0x0 | **99.9%** |
| manufacturer-detail `/manufacturers/details/987` | 0.7138 | 0.7138 ([baseline](./baselines/manufacturer-detail.json)) | v=0.5011 @t=657ms collapse + v=0.1745 @t=240ms push-down | **94.7%** |
| home `/` | 0.6198 | 0.6198 ([baseline](./baselines/home.json)) | v=0.4061 @t=283ms + v=0.1756 @t=295ms: supporting 454→158→0x0, 3 FAQ panels →0x0 | **93.9%** |

Remaining shifts are noise-level (≤0.0221: home hero text settling, title-metro
1px adjustments, notched-outline recalc).

## Mechanism

1. First paint: the eager shell renders FAQ + footer near the top (route chunk +
   data still pending).
2. Lazy route content inserts above 200–650ms later; the supporting subtree is
   destroyed and recreated below it in the same frame (→0x0 source entries).
3. The destroy-frame scores 0.4–0.65 CLS even though the final DOM is correct.

Final-state probe confirms: supporting block 1440x454 below the fold with
`app-faq` + `app-footer` present on all three flows — which is why screenshots
render clean throughout and the breach is invisible without attribution.

## Exonerations (measured, not assumed)

- Fonts: blocking all webfonts leaves `/404` CLS bit-identical; icon-font swap
  held CLS identical (H2). Not the shifter.
- Images: no `<img>` source appears in any top entry on these flows; H7
  aspect-ratio (manufacturers panels) and logo-dims (manufacturer-detail header)
  both reverted bit-identical. Not the shifter.
- NG0956 identity churn: storm class closed at 2 keeps (rack-detail,
  patch-detail) + 5 proven zeros (module-detail, browser, manufacturers, home,
  manufacturer-detail). No candidate remains.
- DOM size: score is a 1–2 frame destroy/recreate, uncorrelated with node
  counts (browser DOM 3486 vs home 1951 score the same supporting transient).

## Relation to H3

H3-R1/R2 isolated the same transient family on `/404` (toolbar shift, then
footer/FAQ collapse exposed by the seeding change) but only ever saw it under
the experimental change; the clean-tree timeline then looked stable. This
addendum reproduces the transient on the **clean tree across content flows** —
the longer lazy-chunk + data window on content routes is what opens the
destroy/recreate race. H3's "content-driven" close-out is superseded by this
finding.

## Verdict and recommendation

No shippable in-scope change: the fix is supporting-block render ordering
(e.g. hold supporting until route stable, reserve space) and/or boot-URL shell
seeding — both parked as out of scope in the runbook. **Recommendation: owner
decision to un-park the supporting-block follow-up.** It now has 4-flow
isolation proof (this addendum + H3 exhibits) and owns ~0.4–0.65 CLS on every
content flow. INP remains unmeasured in lab (no interaction step) — no INP
claim.
