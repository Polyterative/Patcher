# Patcher Internal Wiki

Project-specific guidance for Patcher development. This file is a router only: use it to find the right doc, not as a
second source of rules.

## Start Here

1. Read [../AGENTS.md](../AGENTS.md) for canonical workflow and repo rules.
2. Open only the doc that matches the current need.
3. Prefer the most specific doc available over a broader summary.

## Canonical Docs

### Workflow

| File | Purpose |
|---|---|
| [workflow/TODO.md](./workflow/TODO.md) | Thin index of active tasks and backlog (one line per task) + the Approvals ledger |
| [workflow/plans/](./workflow/plans/) | Per-task plan files — backlog detail, checklists, decision logs ([conventions](./workflow/plans/README.md)) |
| [workflow/CURRENT_FEATURE.md](./workflow/CURRENT_FEATURE.md) | Working detail for the feature currently in progress |
| [workflow/COMPLETED.md](./workflow/COMPLETED.md) | Archive of finished features |
| [workflow/ABANDONED.md](./workflow/ABANDONED.md) | Intentionally dropped work and rationale |
| [workflow/DOCUMENTATION_LIFECYCLE.md](./workflow/DOCUMENTATION_LIFECYCLE.md) | Completed → production-published → publicly documented lifecycle and cross-repo handoff |

### Product

| File | Purpose |
|---|---|
| [product/PRINCIPLES.md](./product/PRINCIPLES.md) | Product philosophy, constraints, and decision framing |
| [product/ROADMAP.md](./product/ROADMAP.md) | Product arc, tiered horizon features, and long-term ideas |

### Reference

| File | Purpose |
|---|---|
| [../AGENTS.md](../AGENTS.md) | Canonical agent rules, workflow, and git conventions |
| [GOLDEN_PRINCIPLES.md](./GOLDEN_PRINCIPLES.md) | Mechanical rules (lint-enforced or on the path to it) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Service layers, project structure, and state boundaries |
| [STYLE_GUIDE.md](./STYLE_GUIDE.md) | Naming conventions and HTML/SCSS conventions |
| [DESIGN_LANGUAGE.md](./DESIGN_LANGUAGE.md) | Visual philosophy, character, inspirations, responsive rules, and anti-patterns |
| [UI_CONSISTENCY_AUDIT.md](./UI_CONSISTENCY_AUDIT.md) | Read-only UI consistency audit findings across app surfaces |
| [agents/README.md](./agents/README.md) | Specialised agent personas, including [`feature-notetaker`](./agents/feature-notetaker.md) for idea intake, [`coordinator-loop`](./agents/coordinator-loop.md) for the full TODO → implementation → review → archive cycle, and [`docs-publisher`](./agents/docs-publisher.md) for confirmed releases |
| [GitHub issue #135](https://github.com/Polyterative/Patcher/issues/135) | Public Open API remaining work: bulk JSONL export, v2 patches/racks, contract/deprecation polish |

### Patterns and Testing

| File | Purpose |
|---|---|
| [patterns/REACTIVE_SERVICES.md](./patterns/REACTIVE_SERVICES.md) | Reactive component/data-service patterns |
| [patterns/BACKEND_METHODS.md](./patterns/BACKEND_METHODS.md) | Backend namespace usage and Supabase method patterns |
| [patterns/UI_PATTERNS.md](./patterns/UI_PATTERNS.md) | UI interaction and shared surface patterns |
| [patterns/RXJS_GOTCHAS.md](./patterns/RXJS_GOTCHAS.md) | Small reactive edge cases and ordering gotchas |
| [patterns/ANALYTICS.md](./patterns/ANALYTICS.md) | Analytics event conventions and PostHog usage patterns |
| [patterns/CACHE_STRATEGY.md](./patterns/CACHE_STRATEGY.md) | Read-cache keys, invalidation rules, and cache-busting after writes |
| [testing/UNIT_TESTING.md](./testing/UNIT_TESTING.md) | Shared unit test conventions and examples |
| [testing/DOCS_SCREENSHOTS.md](./testing/DOCS_SCREENSHOTS.md) | Docs screenshot regeneration, review, and guarded sync workflow |

### Feature Specs

| File | Purpose |
|---|---|
| [tracked-use-cases/PATCH_INSTANCE_SPEC.md](./tracked-use-cases/PATCH_INSTANCE_SPEC.md) | Stable patch-instance behavior spec |
| [tracked-use-cases/PATCH_INSTANCE_OPEN_GAPS.md](./tracked-use-cases/PATCH_INSTANCE_OPEN_GAPS.md) | Patch-instance test and verification gaps |

### Ops

| File | Purpose |
|---|---|
| [ops/LOCAL_BACKUP_INSPECTION.md](./ops/LOCAL_BACKUP_INSPECTION.md) | Local-only backup inspection notes |
| [ops/RELEASE_PROCESS.md](./ops/RELEASE_PROCESS.md) | Release branch runbook and history-safety notes |
| [ops/SENTRY_TRIAGE.md](./ops/SENTRY_TRIAGE.md) | Sentry live-issue triage, fixing, and closing workflow |
| [ops/VERCEL_CI_GATE.md](./ops/VERCEL_CI_GATE.md) | Vercel ignored-build CI gate behavior, token requirements, and troubleshooting |
| [../cloudflare/public-api/README.md](../cloudflare/public-api/README.md) | Public Open API Worker developer/operator overview |
| [../cloudflare/public-api/RUNBOOK.md](../cloudflare/public-api/RUNBOOK.md) | Public Open API gated rollout, rollback, incident, and rotation runbook |

## Legacy Compatibility Stubs

| File | Purpose |
|---|---|
| [FOR_AI_AGENTS.md](./FOR_AI_AGENTS.md) | Stable pointer for older agent-oriented references |
| [PRODUCT_NEEDS.md](./PRODUCT_NEEDS.md) | Legacy pointer to split product docs |
| [PATTERNS.md](./PATTERNS.md) | Legacy pointer to split pattern/testing docs |
| [tracked-use-cases/INSTANCE_SCENARIOS.md](./tracked-use-cases/INSTANCE_SCENARIOS.md) | Legacy pointer to split patch-instance docs |

## Routing Notes

- Strategy and horizon planning → product docs
- Active execution and archives → workflow docs
- Stable project shape → reference docs
- Copyable implementation examples → patterns/testing docs
- Feature-specific behavioral edge cases → tracked use cases
- Local operational procedures → ops docs
