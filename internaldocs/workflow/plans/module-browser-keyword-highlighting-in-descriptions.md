<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Module Browser — keyword highlighting in descriptions

**Status:** OPEN — backlog item; no implementation started yet.

**Why:** When scanning module descriptions in the browser, semantic keywords (filter, VCO,
distortion, LFO, etc.) are currently indistinguishable from surrounding text. Colouring a
small number of matched keywords lets the user scan the category of a module at a glance
without reading every word.

**Scope:** module browser only (`module-part-description.component`). Not on rack pages,
not on the module detail page, not in search results outside the browser context. Controlled
by a `viewConfig` flag so it can be turned off in other display contexts.

**Rules:**
- Highlight at most **2 keyword spans per description** (first 2 matches by pattern priority
  order, left to right in the text). More would create visual noise.
- Keywords are matched against the existing `purposePatterns` from `RACK_BALANCE_AXES` —
  no new keyword list needed; reuse what is already maintained.
- One colour per balance axis (consistent with balance panel colours):

| Axis | Colour token suggestion |
|------|------------------------|
| `voices` | accent-warm (orange-ish) |
| `modulation` | accent-cyan / teal |
| `utilities` | neutral / grey-blue |
| `timing` | accent-yellow / amber |
| `tone` | accent-purple |

  Exact tokens must come from `internaldocs/DESIGN_LANGUAGE.md` / the active theme — no
  hard-coded hex values.

- Highlights are rendered as inline `<span class="desc-kw desc-kw--{axisId}">` elements
  inside the description text, injected via `[innerHTML]` with a sanitized string.
  Angular's `DomSanitizer.bypassSecurityTrustHtml` is acceptable here since the source is
  our own DB text, not user input rendered in a privileged context.

**Implementation:**

- Create `DescriptionKeywordHighlightPipe` (pure pipe, `description-keyword-highlight.pipe.ts`)
  in `module-parts/shared-pipes/`:
  - Input: `description: string`, `maxHighlights: number = 2`
  - Iterates `RACK_BALANCE_AXES` patterns in priority order; for each match wraps the
    matched substring in `<span class="desc-kw desc-kw--{axisId}">`.
  - Stops after `maxHighlights` total matches across all axes.
  - Returns `SafeHtml`.
- In `module-part-description.component.html`, replace `{{ data.description }}` /
  `{{ data.description | ellipsis:144 }}` with `[innerHTML]` bound to the pipe output,
  guarded by a `viewConfig.highlightKeywords` flag (default `false`; set to `true` only
  in module browser context).
- SCSS: `.desc-kw` gets a subtle `font-weight: 500` + colour from CSS custom property;
  no background, no underline — colour only, keeping it calm.
- Unit-test the pipe: assert correct span injection, correct axis class, max-2 cap, and
  that plain text with no matches passes through unchanged.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
