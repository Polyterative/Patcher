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
| [workflow/TODO.md](./workflow/TODO.md) | Active tasks and backlog |
| [workflow/CURRENT_FEATURE.md](./workflow/CURRENT_FEATURE.md) | Working detail for the feature currently in progress |
| [workflow/COMPLETED.md](./workflow/COMPLETED.md) | Archive of finished features |
| [workflow/ABANDONED.md](./workflow/ABANDONED.md) | Intentionally dropped work and rationale |

### Product

| File | Purpose |
|---|---|
| [product/PRINCIPLES.md](./product/PRINCIPLES.md) | Product philosophy, constraints, and decision framing |
| [product/ROADMAP.md](./product/ROADMAP.md) | Product arc, tiered horizon features, and long-term ideas |

### Reference

| File | Purpose |
|---|---|
| [../AGENTS.md](../AGENTS.md) | Canonical agent rules, workflow, and git conventions |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Service layers, project structure, and state boundaries |
| [STYLE_GUIDE.md](./STYLE_GUIDE.md) | Naming conventions and HTML/SCSS conventions |

### Patterns and Testing

| File | Purpose |
|---|---|
| [patterns/REACTIVE_SERVICES.md](./patterns/REACTIVE_SERVICES.md) | Reactive component/data-service patterns |
| [patterns/BACKEND_METHODS.md](./patterns/BACKEND_METHODS.md) | Backend namespace usage and Supabase method patterns |
| [patterns/UI_PATTERNS.md](./patterns/UI_PATTERNS.md) | UI interaction and shared surface patterns |
| [patterns/RXJS_GOTCHAS.md](./patterns/RXJS_GOTCHAS.md) | Small reactive edge cases and ordering gotchas |
| [testing/UNIT_TESTING.md](./testing/UNIT_TESTING.md) | Shared unit test conventions and examples |

### Feature Specs

| File | Purpose |
|---|---|
| [tracked-use-cases/PATCH_INSTANCE_SPEC.md](./tracked-use-cases/PATCH_INSTANCE_SPEC.md) | Stable patch-instance behavior spec |
| [tracked-use-cases/PATCH_INSTANCE_OPEN_GAPS.md](./tracked-use-cases/PATCH_INSTANCE_OPEN_GAPS.md) | Patch-instance test and verification gaps |

### Ops

| File | Purpose |
|---|---|
| [ops/LOCAL_BACKUP_INSPECTION.md](./ops/LOCAL_BACKUP_INSPECTION.md) | Local-only backup inspection notes |

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
