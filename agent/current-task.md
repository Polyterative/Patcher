# Current Task

**Active task:** None — all acceptance-checklist items complete as of 2026-05-13.

**Last completed task:** Add privacy-safe linked-rack viewer handling.

**What shipped:** Guests and non-owners now see the linked rack in read-only mode when a rack is available and accessible. When the rack is unavailable or the viewer lacks access, safe text-first messaging is shown without leaking rack identity or structure. The `PatchEditorComponent` gained a `readonly` input that skips collection loading and disables module clicks. References: commit `6500485` (2026-05-13).

**Feature state:** Patch Builder — Optional Rack Context shipped as v6.0.0 on 2026-05-13. All acceptance-checklist items are now done. One minor Layer 3 Polish review item remains open in the backlog (`internaldocs/workflow/TODO.md`).

**Next step:** Pick the next task from `internaldocs/workflow/TODO.md`. Candidates:
- Review educational/planning flows to ensure rack-linked mode does not weaken non-1:1 use cases (low, carry-over from Layer 3)
- Patch Editing — "No connections" warning not updating after connection added (high, pre-existing bug)
- E2E — Dedicated Test Account Cleanup (high infra task, prerequisite for E2E multi-instance)
