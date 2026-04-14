# Patcher Internal Wiki

Project-specific guidance for Patcher development.

## Files

| File                                                                                 | Purpose                                                     |
|--------------------------------------------------------------------------------------|-------------------------------------------------------------|
| [../AGENTS.md](../AGENTS.md)                                                         | Canonical agent rules, workflow, and git conventions        |
| [FOR_AI_AGENTS.md](./FOR_AI_AGENTS.md)                                               | Legacy compatibility pointer to `AGENTS.md`                 |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                                                 | Service layers, project structure, state strategy           |
| [STYLE_GUIDE.md](./STYLE_GUIDE.md)                                                   | Naming conventions, HTML/SCSS patterns, project conventions |
| [PATTERNS.md](./PATTERNS.md)                                                         | Canonical code templates                                    |
| [PRODUCT_NEEDS.md](./PRODUCT_NEEDS.md)                                               | Product strategy and open design questions                  |
| [TODO.md](./TODO.md)                                                                 | Active tasks and backlog                                    |
| [CURRENT_FEATURE.md](./CURRENT_FEATURE.md)                                           | Working detail for the feature currently in progress        |
| [COMPLETED.md](./COMPLETED.md)                                                       | Archive of finished features                                |
| [tracked-use-cases/INSTANCE_SCENARIOS.md](./tracked-use-cases/INSTANCE_SCENARIOS.md) | Multi-instance edge-case scenarios and test source material |

## Baseline Rules

**Always `pnpm`.** Never `npm`.  
**Tests always `pnpm test-headless`.** Never `ng test`.

## Layer Map

```
Component → Data Service → API Service → Supabase
```

Full pattern templates → [PATTERNS.md](./PATTERNS.md).

## Maintenance

This is a living wiki. When patterns evolve or new conventions emerge, update the appropriate canonical file and do not
duplicate across files.

## Local-only backup inspection

- Install the local browser UI with `brew install pgweb`
- Start the local inspection UI against a restored local backup, then open `http://127.0.0.1:8081/`
- Keep this strictly local; do not document inspection URLs in public-facing docs
