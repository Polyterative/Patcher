<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Module tags — axis-colour tinting (code-highlighting style)

**Why:** Module tag chips are currently all the same neutral colour. Since each tag already
maps to a balance analysis axis (`voices`, `modulation`, `utilities`, `timing`, `tone`)
via `RACK_BALANCE_AXES[n].dbTagNames`, the axis colour can be applied directly to the chip
— giving an instant visual grammar identical to the balance radar. Tags that don't map to
any axis remain neutral.

This is the same colour system proposed for description keyword highlighting — one shared
palette, two surfaces.

**Tag-to-axis mapping:**
The mapping already exists in `RACK_BALANCE_AXES[n].dbTagNames` (exact string match) and
`purposePatterns` (regex). Extract a pure function:

```ts
// rack-balance-analysis.utils.ts (new or alongside constants)
export function resolveTagAxis(tagName: string): RackBalanceAxisId | null
```

This function iterates `RACK_BALANCE_AXES`, checks `dbTagNames` first (exact), then
`purposePatterns` as fallback. Returns the axis id or `null` for unmapped tags. Pure,
zero dependencies, fully unit-testable.

**Visual treatment:**
- Chips get a CSS class `tag-chip--axis-{axisId}` (e.g. `tag-chip--axis-voices`).
- Style: **very light tint** — e.g. a barely-there background from the axis colour at
  10–15 % opacity, or a coloured left border (2 px). Not a solid fill — the chip should
  still read as a chip, not a coloured badge.
- Exact tokens from `internaldocs/DESIGN_LANGUAGE.md` / active theme CSS custom properties
  (same tokens used for description keyword colouring and the balance radar polygon).
- Unmapped tags: default chip style, no tint.

**Scope:**
- Apply in the module browser tag display (`module-tags.component`) and on the module
  detail page.
- Controlled by a `viewConfig` flag `colorTagsByAxis: boolean` (default `false`; opt-in
  per context) so it can be turned off where the visual density would be too high (e.g.
  rack editor tile tooltips).

**Checklist:**

- [ ] Extract `resolveTagAxis(tagName: string): RackBalanceAxisId | null` as a pure
      exported function in `rack-balance-analysis.utils.ts` (or alongside the constants).
- [ ] In `module-tags.component`, bind `[class]="'tag-chip--axis-' + resolveTagAxis(tag.name)"` 
      conditionally when `viewConfig.colorTagsByAxis`.
- [ ] Add SCSS rules for each `.tag-chip--axis-{id}` using CSS custom properties.
- [ ] Add `colorTagsByAxis` to `ModuleMinimalViewConfig` (default `false`).
- [ ] Enable in module browser and module detail contexts only.
- [ ] Unit-test `resolveTagAxis` for all known `dbTagNames` and a few unmapped strings.
- [ ] **Reuse** `resolveTagAxis` in the description keyword highlight pipe — single source
      of truth for tag→axis→colour mapping.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

