# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.

---

## Active

### Rack Balance Analysis — Exclude Blank Modules From Coverage

**Goal:** make the rack balance coverage denominator count only real modules, so blanks/spacers do not distort confidence or coverage copy.

#### Layer 1 — MVP
- [ ] Inspect the current rack balance analysis denominator/confidence logic and confirm where blank spacers are still counted
- [ ] Trace the blank-module identification helper already used by older rack stats so this analysis surface can reuse the same definition

**Layer 1 discoveries:** pending.

#### Layer 2 — Structural
- [ ] Filter blank spacers out before computing coverage/confidence thresholds in the rack balance analysis service
- [ ] Make blank-only racks behave like an empty rack rather than a low-confidence tagged rack

#### Layer 3 — Polish
- [ ] Keep coverage copy/tooltips aligned with the filtered denominator
- [ ] Add focused tests for mixed real+blank racks and blank-only racks

**Current progress:** not started yet in code. Next step is to inspect `rack-balance-analysis.service.ts` and the existing blank-module helpers so the denominator fix comes from one shared definition.

---

## Empty template

```markdown
### Feature Name

**Goal:** one sentence.

#### Layer 1 — MVP
- [ ] step

#### Layer 2 — Structural
- [ ] step

#### Layer 3 — Polish
- [ ] step
```
