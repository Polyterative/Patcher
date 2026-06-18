<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Tag taxonomy — split "PURPOSE" group into sub-groups

**Why:** The `PURPOSE` tag group currently contains ~35 tags in a single flat list (see
screenshot: Attenuate, Blank, Clock Gen, Clock Mod, Compare, Control, Delay, Distort, EQ,
Env. Follow, Envelope Gen., FX, Frequency Div., Full Voice, Function Gen., LFO, LPG,
Logic, Mix, Modulate, Multiply, Noise, Pan, Phase Shift, Pitch Shift, Polarize, Quad,
Quantize, Reverb, Rhythm, Ring Mod, S&H, Sample, Sequence, Slew Limit, Switch, Uncertainty,
Utility, VCA, VCF, VCO, Waveshape). This is unmanageable to scan.

**Approved type groups** (DB `tags.type` value):

| Type ID | Group label | Tags |
|---------|-------------|------|
| `3` | `Voice` | Full Voice, VCA, VCO |
| `4` | `Source` | Noise |
| `5` | `Filter` | VCF, LPG, EQ |
| `6` | `Modulation` | Clock Gen., Clock Mod, Env. Follow, Envelope Gen., Frequency Div., Function Gen., LFO, Modulate, Quantize, S&H, Slew Limit, Uncertainty |
| `7` | `Effect` | Delay, Distort, FX, Phase Shift, Pitch Shift, Reverb, Ring Mod, Waveshape |
| `8` | `Sequencing` | Rhythm, Sample, Sequence |
| `9` | `Utility` | Attenuate, Compare, Control, Logic, Mix, Multiply, Pan, Polarize, Quad, Switch, Utility |
| `10` | `Blank` | Blank |

> **Note:** Tag name strings must not be changed. This task only changes the `tags.type`
> grouping values.

**Implementation notes:**

- `tags.type` is stored as an integer in the DB (`0 = purpose`, `1 = nature`, `2 = character`).
  The app already maps functional groups `3–9`; this pass adds `10 = Blank`.
- The split is a **data migration** (UPDATE statements on `tags` rows) — requires explicit
  user approval per `AGENTS.md §5` before running. Draft the migration SQL but do not apply
  autonomously.
- `isBalanceRelevantTagType` and `getPatternsForTagType` in `rack-balance-analysis.service.ts`
  must be updated to recognise the new type names so balance analysis continues to work.
- The tag proposer panel in `module-tags.component.html` groups by `type` label — the new
  groups will appear automatically once the DB rows are updated and types are mapped.
- **No UI code change needed** for the grouping UI itself — it already renders groups
  dynamically from the data.

**Checklist:**

- [x] Confirm final group assignments with product owner (edge cases above).
- [x] Define new integer IDs for each new type and add to `NUMERIC_TAG_TYPE_NAMES`.
- [x] Draft migration SQL: `UPDATE tags SET type = <new_id> WHERE name IN (...)` for each
      group — one statement per group for clarity and reviewability.
- [x] Get explicit user approval for regrouping.
- [ ] Apply migration to production.
- [x] Update `isBalanceRelevantTagType` to include new type names.
- [x] Update `getPatternsForTagType` if the new types need different pattern sets.
- [ ] Run `pnpm updateBackendTypes` after any schema changes (not needed here — `tags.type`
      column type does not change).
- [ ] Smoke-test the tag proposer panel and balance analysis after migration.

---

## Decision log

- 2026-06-18T10:57+02:00 — Product owner approved regrouping the existing tag names and keeping `Blank` as its own group; tag name strings must remain unchanged.
- 2026-06-18T10:59+02:00 — Implemented code support for `TagType.Blank = 10` and drafted migration `20260618105927_split_purpose_tag_groups.sql`, which updates only `tags.type`.
