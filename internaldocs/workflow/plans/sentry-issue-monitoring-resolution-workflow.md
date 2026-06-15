<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Sentry — Issue Monitoring & Resolution Workflow

**Why:** Sentry is already integrated and collecting error data, but there is currently no process
to regularly review reported issues and address them. A backlog of unresolved errors is accumulating.
Future work should establish a lightweight routine (or automated agent workflow) that queries Sentry
for open issues, triages them by frequency/severity, and works through fixes systematically.

**Tokens:** Sentry API credentials are already present in the project (available via MCP or
environment config) — no new setup required to start.

- [ ] Audit current open Sentry issues and categorise by frequency, severity, and affected surface
- [ ] Establish a recurring review cadence (manual or agent-assisted) for new Sentry events
- [ ] Resolve the highest-impact issues identified in the initial audit
- [ ] Explore MCP / automated tooling to let the AI agent query and triage Sentry data directly
- [ ] Document the agreed workflow so future agents know the process

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

