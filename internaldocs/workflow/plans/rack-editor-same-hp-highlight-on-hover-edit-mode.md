<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Rack Editor — Same-HP highlight on hover (edit mode)

**Status:** OPEN — backlog item; no implementation started yet.

**Why:** When deciding whether to swap two modules, the user needs to know which other
modules are the same width. Currently there is no visual cue — they have to remember or
read the HP label on each tile individually.

**Behaviour:** active **only** when the rack is in edit mode (`isCurrentRackEditable === true`
AND `isCurrentRackPropertyOfCurrentUser === true`) **and** analysis mode is `off`. Hovering
any module tile highlights all other tiles that share the same `module.hp` value; non-matching
tiles dim slightly. The hovered tile stays at full brightness. On mouse-leave everything
returns to normal instantly. When analysis mode is anything other than `off`, the existing
analysis overlays take full control and this highlight is suppressed entirely.

**Implementation notes:**
- `rack-visual-model.component.ts` already tracks `hoveredRackedModule`. Derive
  `hoveredHp: number | null` from it.
- In the template, add a CSS class (e.g. `module--sameHpHighlight` / `module--sameHpDim`)
  to each tile based on `hoveredHp`, **guarded by both** `isEditable && analysisMode === 'off'`:
  - `module--sameHpHighlight` → `rackedModule.module.hp === hoveredHp && !isHovered`
  - `module--sameHpDim` → `rackedModule.module.hp !== hoveredHp && hoveredHp !== null`
- Keep the SCSS transition short (100–150 ms opacity ease) so it feels snappy, not
  distracting.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
