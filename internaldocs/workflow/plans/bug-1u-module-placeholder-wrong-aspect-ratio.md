<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: Bug — 1U module placeholder wrong aspect ratio

**Why:** When a 1U module has no panel image, the grey placeholder rectangle shows with
3U-like tall proportions instead of the correct wide, flat 1U shape (see screenshot:
"1U Mult" — Intellijel 1U 10HP — shows as a narrow portrait rectangle instead of a
landscape slab). Pulp Logic 1U is also likely affected.

**Root cause (confirmed by template inspection):**

In `module-part-image.component.html`, the `!filename` placeholder branch:

```html
<div [fxFlex]="data.hp/sizeDivider/2+'rem'"
     [ngStyle]="fixedHeight ? {} : {height:((bag.height)/sizeDivider/2+'rem')}"
     class="preview img">
```

`[fxFlex]` is used to set the **width** (HP-based), but `fxFlex` in an Angular FlexLayout
context sets the **flex-basis** along the main axis. If the parent `lib-screen-wrapper`
uses a **column** flex layout, `fxFlex` applies along the vertical axis — so `data.hp`
sets the **height** and `bag.height` (format height in rem) ends up wrong or ignored.
This produces portrait proportions for a 10HP 1U module (should be wide, flat).

Compare with the `filename` branch: `<img [ngStyle]="{maxHeight:...}"` only constrains
height and lets the image fill width naturally — it does not have this problem because
actual images have intrinsic dimensions.

**Fix:**

Replace `fxFlex` with an explicit `[ngStyle]` width binding on the placeholder `<div>`:

```html
<div [ngStyle]="fixedHeight
       ? {}
       : { width: (data.hp / sizeDivider / 2) + 'rem',
           height: (bag.height / sizeDivider / 2) + 'rem' }"
     class="preview img">
```

This makes the dimensions explicit and immune to flex-direction.
Verify `fixedHeight` path also sets correct 1U proportions.

**Checklist:**

- [x] Fix `module-part-image.component.html` placeholder `<div>`: replace `[fxFlex]`
      width with `[ngStyle]` explicit width + height binding.
- [ ] Verify fix visually for Intellijel 1U (standard.id=1) and Pulp Logic 1U
      (standard.id=2) with a module that has no panel image. (manual — requires live app)
- [x] Verify 3U placeholder is unaffected. (no template change to the 3U path)
- [x] Verify `fixedHeight=true` mode also renders correct proportions for 1U.
      (CSS `.preview--fixed-height` already enforces width:100% height:8rem — ngStyle emits {})
- [ ] Snapshot/visual test with Playwright if feasible.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

