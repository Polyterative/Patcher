# Patcher Internal Wiki

Project-specific guidelines for Patcher development.

## Files

| File                                   | Purpose                                                                         |
|----------------------------------------|---------------------------------------------------------------------------------|
| [FOR_AI_AGENTS.md](./FOR_AI_AGENTS.md) | ⚠️ **Start here.** Enforcement rules, autonomy rules, workflow, git conventions |
| [ARCHITECTURE.md](./ARCHITECTURE.md)   | Service layers, project structure, state strategy                               |
| [STYLE_GUIDE.md](./STYLE_GUIDE.md)     | Naming conventions, HTML/SCSS patterns, project conventions                     |
| [PATTERNS.md](./PATTERNS.md)           | Canonical code templates — copy from here                                       |
| [PRODUCT_NEEDS.md](./PRODUCT_NEEDS.md) | Product strategy, open design questions, feature status                         |
| [TODO.md](./TODO.md)                   | Active tasks, backlog with steps, completed history                             |

## Package Manager

**Always `yarn`.** Never `npm`.  
**Tests always `yarn test-headless`.** Never `ng test`.

## Layer Map

```
Component → Data Service → API Service → Supabase
```

Full pattern templates → [PATTERNS.md](./PATTERNS.md).

## Contributing

This is a living wiki. When patterns evolve or new conventions emerge, update the appropriate canonical file and do not
duplicate across files.