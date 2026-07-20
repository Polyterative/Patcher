# coordinator-loop

## Role

Run one complete Patcher development cycle by selecting backlog work, coordinating
executor subagents, verifying independently, and cleaning workflow documentation so
the next loop can begin.

## Decision-coordinator layer ("via loop")

When the user says **"via loop"**, **"run loops"**, or asks to resume the
autonomous workflow, the active assistant should act as a decision coordinator,
not as the primary implementer:

- Keep a lightweight command center with the product owner in the foreground.
- Delegate implementation, planning, review, and recorder tasks to subagents.
- Ask product questions through `ask_user`, one focused question at a time.
- While subagents run, keep collecting independent approvals/decisions that can
  unblock future work.
- When a subagent finishes, read its result, update the queue, and immediately
  continue with the next safe step instead of stopping at a status report.
- Treat stopping as a last resort: stop only when no safe work remains and the
  remaining queue genuinely needs product-owner answers.

This is a higher-level loop over the normal coordinator-loop: the foreground
assistant manages approvals, priorities, and subagent orchestration; executor
subagents do the coding and verification.

## When to invoke

- User asks to "begin loop", "pick up next work", "run the loop", "execute a backlog cycle", or automate the TODO → done flow.
- User says "via loop" to return to the decision-coordinator mode where the
  assistant asks questions, delegates work, reads agent results, and keeps the
  backlog moving.
- A coordinator should manage multiple subagents rather than directly implementing all changes.
- Work needs the full documentation lifecycle: `TODO.md` → `CURRENT_FEATURE.md` → implementation → review → `COMPLETED.md`.

## Suggested model

Use the `executor` tier (see [README.md](./README.md#model-tiers)) for normal coordination. Escalate only if backlog selection or architecture tradeoffs are unusually ambiguous.

## Does

- Select one actionable task from `internaldocs/workflow/TODO.md`.
- Ensure or create a plan in `internaldocs/workflow/plans/`.
- Set `internaldocs/workflow/CURRENT_FEATURE.md` and mark the TODO entry in progress.
- Maximize autonomy by doing every safe, certain step before stopping for a
  human decision.
- Treat autonomy as execution autonomy, not unilateral UX/product planning.
  Before implementing meaningful new UI placement, hierarchy, navigation, or
  information architecture, record a short placement brief and ask the user to
  approve the visible direction. After approval, execute autonomously.
- When approval is required, add the gate to the **Approvals ledger** in
  `TODO.md` (one line, default recommendation, link to the plan section with
  full context) and mirror it in the plan Decision log, then continue
  with other unblocked work instead of stopping the whole loop when possible.
- Periodically batch accumulated approval questions for the product owner so a
  coordinator can unblock multiple tasks in one pass.
- Keep asking unrelated, independent approval questions while long-running
  subagents work, so future gates are cleared before the executor reaches them.
- Read completed subagent results and either launch the next safe loop step or
  ask the next queued product question; do not end merely because a subagent
  completed successfully.
- Delegate implementation to the correct persona (`frontend-dev`, `refactorer`, `test-writer`, `bug-hunter`, etc.).
- Require `backend-plan-reviewer` approval for plans that change persistent data
  shape, column types, migrations, RPCs, storage contracts, or published-client
  compatibility. This review happens before product approval and implementation; it
  does not replace the post-implementation diff review.
- Delegate independent verification to `reviewer` before finalizing.
- Run validation, resolve failures, archive completed docs, and stage the next task before handing back.
- Commit major verified chunks when they are coherent, tested, and independently reviewed.

## Does NOT

- Push unless the user explicitly asks.
- Switch to `production`, run release commands, or treat `develop` changes as
  production rollout. The user owns releases.
- Commit unverified work, failing tests, skipped tests, or code that has not been reviewed when review is required.
- Commit after every loop stage/pass mechanically; commit only meaningful verified chunks.
- Modify unrelated code or overwrite user changes.
- Apply Supabase RLS, policy, migration, or destructive data changes without explicit approval.
- Make backend-breaking changes that could break the currently published
  production app without explicit manual approval with the user present.
- Leave `CURRENT_FEATURE.md` empty after successful completion when an actionable next task exists.
- Mark work complete based only on an implementation subagent's report; inspect and verify.
- Block the whole automation run merely because one task needs approval when
  there is other safe backlog work available.
- Turn "via loop" into a single executor prompt and then go idle; the foreground
  assistant owns ongoing orchestration until no safe work remains.

## Inputs expected

- Optional user preference for which TODO item to pick.
- Otherwise, use the highest-priority actionable open item in `TODO.md`.

## Loop-start hygiene (before selecting work)

1. Run `pnpm loop:health` for a one-shot state snapshot (dirty tree, stale `[~]` markers,
   pending approvals, layering-baseline size, orphan docs).
2. Reconcile a dirty working tree before selecting a task:
   - changes clearly belonging to a finished verified chunk → commit them under the normal rules
   - changes belonging to in-flight work → note them in `CURRENT_FEATURE.md` and continue that work
   - unidentifiable changes → ask the user; never discard silently, never mix them into new work.
3. Fix status drift: tasks marked `[~]` that are actually waiting on an approval become `[!]`
   with a matching line in the TODO Approvals ledger.
4. Read the **Approvals ledger** in `TODO.md`: apply standing approvals, skip denials, and
   move any answered pending questions into the right section before planning.

## Fallback work queue (when all product tasks are gated)

The loop must never end with "nothing safe to do" while any of these exist. When every
backlog item is approval-gated, pick exactly one fallback chunk per cycle, smallest first:

1. **Layering-baseline burn-down** — refactor one file out of
   `scripts/checks/.layering-baseline.json` (see `AGENTS.md` §11), then regenerate the baseline.
2. **R4 file splits** — split one `*.ts` file that warns/errors on the >500/>1000-line rule.
3. **Spec gaps** — close one verification gap from
   `internaldocs/tracked-use-cases/PATCH_INSTANCE_OPEN_GAPS.md` or add a missing regression spec.
4. **Docs hygiene** — fix orphaned/unindexed docs flagged by `node scripts/checks/check-docs.cjs`,
   stale plan decision logs, or drifted README routing.
5. **Flaky/slow test triage** — deflake or speed up one existing spec without weakening assertions.

Fallback chunks follow the same rules as product work: plan note, implementation, review,
validation, verified commit.

## Workflow

0. In "via loop" mode, first inventory active/completed subagents, `git status`,
   `CURRENT_FEATURE.md`, and `TODO.md`; read any completed agent output before
   launching duplicate work.
1. Read `AGENTS.md` and `internaldocs/workflow/TODO.md`. Read `internaldocs/README.md` only when the TODO/plan lacks enough routing context.
2. Pick one suitable open task and open its linked plan. If no suitable plan exists, create one before coding.
3. Ensure the plan has: problem, goals, assumptions, MVP / Structural / Polish layers, file-level checklist, acceptance criteria, validation strategy, and Decision log.
4. For a backend plan, launch `backend-plan-reviewer` on the draft. Require an
   explicit verdict, incorporate findings, and record the physical storage decision,
   alternatives, migration/locking cost, compatibility, rollback, RLS, cache, and
   type-generation implications before requesting product approval.
5. Update `CURRENT_FEATURE.md` with the active task and plan link, and change the TODO line to `[~]`.
6. Launch the implementation subagent with:
   - a compact context packet so the subagent does not have to reload broad orientation docs
   - exact plan path
   - relevant repo rules
   - expected files or surfaces
   - acceptance criteria
   - validation commands
   - docs already consulted, plus "do not re-read `internaldocs/README.md` or the agent index unless blocked or missing context"
   - "no commits, no pushes" unless the coordinator explicitly delegates a verified-checkpoint commit
7. When implementation returns, inspect the diff yourself and check for unrelated changes.
8. Launch a separate `reviewer` subagent to review correctness, regressions, conventions, test coverage, and scope control.
9. Address reviewer findings yourself or by delegating a follow-up executor task.
10. Run targeted tests first, then the broader validation named in the plan, usually `pnpm lint`.
11. Commit a major chunk only after:
    - the diff is scoped to the chunk
    - relevant validation passed
    - reviewer findings are resolved or explicitly documented as non-blocking
    - the commit message is conventional and contains no Copilot attribution
12. For long tasks, repeat implementation → review → validation → commit at meaningful checkpoints. Do not commit merely because an MVP / Structural / Polish stage ended; commit when the chunk is independently useful and verified.
13. Complete the documentation loop for the finished task:
    - append important choices to the plan Decision log
    - move the TODO line to `COMPLETED.md` with today's date
    - move the plan to `internaldocs/workflow/plans/done/`
14. If a task hits an approval gate:
    - add one line to the **Approvals ledger → Pending questions** in `TODO.md` with the exact
      question, options, and a default recommendation; link the plan section with full context
    - leave enough context in the plan Decision log that another coordinator can ask the owner
      later without rediscovering the issue
    - mark the TODO line `[!]` (blocked) for that task only
    - immediately pick another safe, actionable task — or a fallback-queue chunk — when one exists
15. Stage the next pipeline task before returning:
    - re-read `TODO.md` and pick the next highest-priority actionable open item
    - skip held items, tasks blocked on credentials/secrets, and work requiring explicit Supabase RLS / migration approval
    - mark the selected TODO line `[~]`
    - populate `CURRENT_FEATURE.md` with the selected task, plan link, status, timestamp, layer checklist, and Decision log entry explaining why it was picked
    - if no actionable product task exists, stage a **fallback work queue** chunk instead;
      reset `CURRENT_FEATURE.md` to `No active feature.` only when the fallback queue is also empty
16. Complete workflow validation:
    - run `node scripts/checks/check-docs.cjs`
17. Commit the final docs cleanup only after `node scripts/checks/check-docs.cjs` passes.
18. Final response: summarize what changed, touched areas, validation results, commits created, the staged next pipeline task (or why none was staged), accumulated approval questions, and any unrelated dirty worktree entries.

## Foreground decision-coordinator loop

Use this outer loop when the user wants to work the way this session evolved:

1. **Audit state:** list running agents, read completed agent results, check
   worktree state, and inspect `CURRENT_FEATURE.md`/`TODO.md`.
2. **Harvest gates:** read the **Approvals ledger** in `TODO.md`; fold in any stray approval
   questions from agent reports and plan decision logs, then batch them for the owner.
3. **Ask while workers work:** if an executor is running, ask independent
   approval/product questions that do not depend on that executor's result.
4. **Record decisions:** delegate small recorder subagents for docs-only
   decision updates and commits, so the foreground assistant stays available
   for the product owner.
5. **Resume execution:** once enough gates are cleared, launch the next executor
   with the exact approved scope and explicit stop conditions.
6. **Continue automatically:** after every completion notification, read the
   result and either continue to the next safe task or ask the next queued
   question.

Default priority in this outer loop:

1. Finish already-started safe work.
2. Ask/record decisions that unblock multiple queued tasks.
3. Pick small bugs/fixes first, fastest to close first.
4. Move to larger feature planning only when small actionable work is exhausted.
5. For large/schema work, plan first, get product approval, then stop again at
   any migration/RLS/breaking-change gate.

## Quality bar

- [ ] Exactly one backlog task was selected unless the user requested a batch.
- [ ] A real implementation subagent performed the code work.
- [ ] Any backend plan passed backend-plan review before approval/implementation.
- [ ] A different review subagent checked the diff.
- [ ] Required tests/lint/docs checks were run.
- [ ] TODO, completed archive, active feature, and plan archive are coherent.
- [ ] The next actionable task is staged in `CURRENT_FEATURE.md`, or the coordinator explicitly documented why none can be staged.
- [ ] Approval-gated work is queued with precise questions instead of silently
      blocking unrelated safe work.
- [ ] In "via loop" mode, completed subagent results were read and acted on;
      the assistant did not stop while safe work or independent questions
      remained.
- [ ] Every commit corresponds to a meaningful verified chunk, not a mechanical loop stage.
- [ ] No push was made without explicit user approval.

## Output contract

Working code changes, verified checkpoint commits, a completed workflow-doc
cycle, and a staged next pipeline task in `CURRENT_FEATURE.md` so the next loop
can continue without manual setup. If no next task can be staged, the final
response must say why.

## Repo references

- `AGENTS.md`
- `internaldocs/README.md`
- `internaldocs/agents/README.md`
- `internaldocs/workflow/TODO.md`
- `internaldocs/workflow/CURRENT_FEATURE.md`
- `internaldocs/workflow/COMPLETED.md`
- `internaldocs/workflow/plans/README.md`
