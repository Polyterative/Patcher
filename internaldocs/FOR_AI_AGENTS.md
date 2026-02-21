# For AI Coding Agents

> **Rules for AI agents using this file:**
> 1. **CLAUDE.md is the authoritative source** for all development rules, checklists, naming conventions, git format,
     > and workflow. Do not duplicate or override it here.
> 2. **This file covers only:** tool names for this environment + file ownership map.
> 3. **Product status → [PRODUCT_NEEDS.md](./PRODUCT_NEEDS.md). Active tasks → [TODO.md](./TODO.md). Current
     > feature → [CURRENT_FEATURE.md](./CURRENT_FEATURE.md).**

---

## Tool Names (Claude Code)

| Task                | Tool                                                                                       |
|---------------------|--------------------------------------------------------------------------------------------|
| Read files          | `Read`                                                                                     |
| Search content      | `Grep`                                                                                     |
| Find files          | `Glob`                                                                                     |
| Edit files          | `Edit`                                                                                     |
| Write new files     | `Write`                                                                                    |
| Terminal / scripts  | `Bash` ← last resort; use dedicated tools above whenever possible                          |
| Install packages    | `Bash(yarn add <pkg>)` ← only valid non-script terminal use                                |
| Run tests           | `Bash(yarn test-headless [--include="**/file.spec.ts"])` ← always via package.json scripts |
| Regenerate DB types | `Bash(yarn updateBackendTypes)` ← only after Supabase schema change                        |

**Never use Bash to:** read files · search content · find files · apply edits — use dedicated tools instead.
**Never run:** `ng test` · `npx ng test` · `npm install` · any interactive/watch command.
**Never start the dev server** — the environment is already running; just run `yarn test:e2e`.

---

## File Ownership

| What                                          | Where                |
|-----------------------------------------------|----------------------|
| Agent rules, workflow, checklists, git format | `CLAUDE.md`          |
| Active feature — steps, gotchas, test results | `CURRENT_FEATURE.md` |
| Backlog and active tasks                      | `TODO.md`            |
| Finished features archive                     | `COMPLETED.md`       |
| Product goals and strategy                    | `PRODUCT_NEEDS.md`   |
| Code patterns and templates                   | `PATTERNS.md`        |
| Naming, HTML, SCSS conventions                | `STYLE_GUIDE.md`     |
| Layer and structure reference                 | `ARCHITECTURE.md`    |