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

### Rack Details — Hide HP Override Counters During Image Upload / Update

**Goal:** make sure rack-image upload/update mode never leaks the old HP override counters, keeping the existing suppression behavior consistent across all rack-detail image-editing states.

#### Layer 1 — MVP
- [ ] Trace the rack-detail image upload/update states and identify where HP override counters still remain visible
- [ ] Confirm which current guards already suppress HP override UI in adjacent rack-detail states

**Layer 1 discoveries:** pending.

#### Layer 2 — Structural
- [ ] Extend the existing visibility contract so upload/update state also suppresses HP override counters
- [ ] Keep the fix narrow so normal rack-detail viewing/editing behavior does not change outside the image-update path

#### Layer 3 — Polish
- [ ] Add focused coverage for the upload/update state where the counters previously leaked through
- [ ] Audit nearby rack-detail HP copy/labels only if the guard change reveals another inconsistent state

**Current progress:** not started yet in code. Next step is to inspect the rack-detail image-editing template/state flags and follow the existing HP override visibility guards instead of introducing a parallel rule.

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
