# Patcher Design Language

Canonical reference for visual and interaction design decisions in Patcher.
This document is authoritative for the `designer` agent persona and for any human contributor making UI changes.

---

## Philosophy

**Zero bullshit. Maximum truth.**

Every element on screen must earn its place. If it can be removed without losing meaning, remove it.
If it can be simplified without losing precision, simplify it. There is no decorative padding here.

Patcher is built by a designer-programmer: both disciplines are first-class.
The craft shows in the intersection — code is designed, design is engineered.
Every pixel has a reason. Every decision can be defended.

---

## Character

- **Direct.** No softening. Labels say exactly what things are. Actions say exactly what they do.
- **Opinionated.** Patcher has a point of view. It is not neutral or generic.
- **Precise.** Visual relationships are exact, not approximate. 1px off is 1px wrong.
- **Earned complexity.** A small learning curve is acceptable — even desirable — if it unlocks genuine power.
  What is *not* acceptable is complexity that serves aesthetics over function.
- **Laboratory grade.** The aesthetic is closer to a measurement instrument than a consumer app.
  Think calibration marks, not mood lighting.

---

## Design Inspirations

These are not style references to copy — they are sources of *principle*:

### Intellijel / Frap Tools (Eurorack modular)
- Dense, functional panels where every control has a purpose and a clear label
- Black or near-black backgrounds with high-contrast typography and indicators
- Information hierarchy through **position and weight**, not decoration
- Modular logic: each element is self-contained, composable, pluggable
- Tiny labels that reward attention — the interface respects user intelligence

### Ableton Live
- Dark, restrained palette — the content is the colour, the chrome is not
- Consistent visual grammar across deeply different contexts (session view, arrangement, devices)
- Adaptive density: same information feels natural at different zoom levels
- Functional animation only — feedback loops that convey state, not decoration
- Professional-grade without being intimidating on first contact

**Common thread:** tools built for people who will spend thousands of hours inside them.
Clarity survives fatigue. Precision builds trust. Personality is structural, not cosmetic.

---

## Visual Dimensions

### Typography

- **Never use:** Inter, Roboto, Open Sans, Lato, or other neutral system defaults
- **Direction:** technical / monospace / geometric. Choose fonts that read as *instrument*, not *document*
- Type scale is **tight** — not cramped, but not airy. Information density is a feature
- Labels are sentence-case or ALL-CAPS depending on context; never mixed-case decoratively
- Numeric data uses tabular/monospace figures so columns align

### Colour

- **Base:** near-black background with restrained, purposeful surface layers
- **Accents:** one primary action colour, used sparingly so it retains signal value
- **State colours** (success / warning / error / info) must be immediately distinguishable but never garish
- Avoid gradients unless they encode real information (e.g. a continuous range)
- No shadows for decoration — use shadows only to convey layering depth that matters

### Spacing and Density

- Patcher is dense by design. Empty space is not the default luxury — it is a deliberate choice
- Spacing scale follows `tools-utilities.scss` (gap0 → gap3). Do not introduce ad-hoc values
- Padding within interactive elements: generous enough to hit, tight enough to pack
- Vertical rhythm is consistent within a surface; deviations signal hierarchy, not accident

### Motion and Animation

- **Short and intentional.** If it takes longer than 150ms it needs justification
- No decorative idle animation on work surfaces (see `UI_PATTERNS.md` § Tablet Guardrails §6)
- State transitions (show/hide, expand/collapse) use opacity + scale; never layout-breaking transforms
- Loading states are honest: skeleton or spinner, never false progress

### Iconography

- Material Icons are the default set — do not mix icon families
- Icon-only actions require a tooltip. No exceptions
- Icon size must respect the surrounding type size, not be independently chosen

---

## Adaptive Design (Responsive Philosophy)

Patcher has many breakpoints because every context deserves an **optimal** layout — not just a scaled-down one.

Rules:
1. **At every breakpoint, the UI is in its most efficient state.** Efficiency = maximum usable information with minimum cognitive load for that screen size and input method
2. Use `tools-utilities.scss` layout classes (`.col-lt-MD`, `.col-lt-LG`, etc.) before writing custom breakpoint CSS
3. Touch surfaces follow `UI_PATTERNS.md` § Tablet Guardrails — visible primary actions, generous tap targets
4. Test at minimum: mobile portrait, tablet portrait, tablet landscape, desktop 1280px, desktop 1920px
5. **Never collapse content silently.** If something doesn't fit, decide: reflow, truncate with affordance, or hide with explicit disclosure

---

## Design Process

### Every decision has a reason

Before committing a visual change, articulate: *why this colour / size / spacing and not another?*
If the answer is "looks good", keep asking. The real answer is always about relationship to adjacent elements or about the user's task.

### Changes cascade

Every UI modification must trigger a holistic review of the affected surface:
- Do adjacent elements still relate correctly?
- Are spacing relationships preserved?
- Does the visual hierarchy still read correctly?
- Are all breakpoints still consistent?

A change that fixes one spot and breaks the surrounding system is not done.

### Refinement is the work

Patcher's quality comes from many passes, not one. A "good enough" first pass is expected.
The standard is not first-try perfection but disciplined iteration until every angle is correct.

---

## Anti-patterns (Never Do)

| Anti-pattern | Why |
|---|---|
| Default font stack (Inter, system-ui) | Generic, no character, dilutes identity |
| Gradients for visual interest | Decoration without information |
| Shadow-heavy card stacking | Adds visual noise, implies depth that isn't there |
| Color-coded decoration | Colour must encode state, not decoration |
| Hover-only affordances on touch surfaces | Invisible on tablet/mobile |
| Long-running idle animation | Distracts on a work surface |
| Prose labels where a word would do | Violates zero-bullshit principle |
| New layout values outside `tools-utilities.scss` scale | Breaks spacing consistency |
| `!important` without inline comment explaining why | Future maintainers deserve the reason |

---

## Relationship to Other Docs

- Implementation patterns → `internaldocs/patterns/UI_PATTERNS.md`
- SCSS naming and layout helpers → `internaldocs/STYLE_GUIDE.md` + `src/app/style/tools-utilities.scss`
- Agent workflow for visual changes → `internaldocs/agents/designer.md`
- Known inconsistencies to fix → `internaldocs/UI_CONSISTENCY_AUDIT.md`
