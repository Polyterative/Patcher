<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Tag taxonomy — split "PURPOSE" group into sub-groups

**Why:** The `PURPOSE` tag group currently contains ~35 tags in a single flat list (see
screenshot: Attenuate, Blank, Clock Gen, Clock Mod, Compare, Control, Delay, Distort, EQ,
Env. Follow, Envelope Gen., FX, Frequency Div., Full Voice, Function Gen., LFO, LPG,
Logic, Mix, Modulate, Multiply, Noise, Pan, Phase Shift, Pitch Shift, Polarize, Quad,
Quantize, Reverb, Rhythm, Ring Mod, S&H, Sample, Sequence, Slew Limit, Switch, Uncertainty,
Utility, VCA, VCF, VCO, Waveshape). This is unmanageable to scan.

**Proposed new type groups** (DB `tags.type` value, new integers to be assigned):

| New type name      | Tags                                                                                     |
|--------------------|------------------------------------------------------------------------------------------|
| `purpose_voice`    | VCO, VCF, VCA, LPG, Full Voice, Noise, Waveshape, Ring Mod, Distort, Phase Shift, EQ    |
| `purpose_modulation` | LFO, Envelope Gen., Env. Follow, Function Gen., S&H, Slew Limit, Quantize, Clock Gen., Clock Mod, Frequency Div., Uncertainty |
| `purpose_utility`  | Attenuate, Mix, Pan, Multiply, Compare, Polarize, Quad, Switch, Logic, Control, Utility |
| `purpose_time_fx`  | Delay, Reverb, FX, Pitch Shift                                                           |
| `purpose_sequencing` | Sequence, Rhythm, Sample, Modulate                                                     |
| `purpose_blank`    | Blank *(keep separate or merge into utility — decide before migrating)*                  |

> **Note:** exact assignment of edge cases (e.g. "Modulate" could be modulation or
> sequencing; "Control" could be utility or sequencing) should be confirmed with the product
> owner before the migration runs.

**Implementation notes:**

- `tags.type` is stored as an integer in the DB (`0 = purpose`, `1 = nature`, `2 = character`).
  New type IDs for the sub-groups need to be defined (e.g. `3–8`) and the mapping added to
  `NUMERIC_TAG_TYPE_NAMES` in `rack-balance-analysis.service.ts`.
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

- [ ] Confirm final group assignments with product owner (edge cases above).
- [ ] Define new integer IDs for each new type and add to `NUMERIC_TAG_TYPE_NAMES`.
- [ ] Draft migration SQL: `UPDATE tags SET type = <new_id> WHERE name IN (...)` for each
      group — one statement per group for clarity and reviewability.
- [ ] Get explicit user approval, then run migration on production.
- [ ] Update `isBalanceRelevantTagType` to include new type names.
- [ ] Update `getPatternsForTagType` if the new types need different pattern sets.
- [ ] Run `pnpm updateBackendTypes` after any schema changes (not needed here — `tags.type`
      column type does not change).
- [ ] Smoke-test the tag proposer panel and balance analysis after migration.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

