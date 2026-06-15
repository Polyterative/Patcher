<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Angular — Audit migration-added eager change detection

**Status:** Backlog.

**Why:** The Angular 22 migration added `ChangeDetectionStrategy.Eager` to preserve behavior. Some components may be safe to move back to `OnPush` once verified.

**Scope:**
- Review each migration-added `ChangeDetectionStrategy.Eager` component/spec fixture.
- Keep eager strategy where behavior depends on it.
- Convert candidates to `OnPush` only with focused tests or UI validation.

**Success criteria:**
- Each eager strategy has either a reason to stay or has been safely converted.
- Tests and relevant UI smoke checks pass after any conversion.

## Decision log

- 2026-06-15 — Added as a low-priority follow-up because correctness matters more than immediate OnPush cleanup.
