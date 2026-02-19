# For AI Coding Agents

> **Rules for AI agents using this file:**
> 1. **Read this file first** — it governs all other files and overrides nothing.
> 2. **Do not duplicate** code patterns here; canonical patterns live
     in [PATTERNS.md](./PATTERNS.md), [STYLE_GUIDE.md](./STYLE_GUIDE.md), and [ARCHITECTURE.md](./ARCHITECTURE.md).
> 3. **Capture new guidelines here** — if the user expresses a workflow preference or decision principle, add it to the
     appropriate section.
> 4. **Product status → [PRODUCT_NEEDS.md](./PRODUCT_NEEDS.md). Active tasks → [TODO.md](./TODO.md). Current
     feature → [CURRENT_FEATURE.md](./CURRENT_FEATURE.md).**

---


## 🤖 Autonomy & Tool Priority

**Tools first. Terminal last. Maximum autonomy.**

| Task                | How                                                                                             |
|---------------------|-------------------------------------------------------------------------------------------------|
| Read files          | `read_file`                                                                                     |
| Search patterns     | `grep_search`                                                                                   |
| Find files          | `file_search`                                                                                   |
| Browse structure    | `list_dir`                                                                                      |
| Edit files          | `replace_string_in_file` / `insert_edit_into_file`                                              |
| Install packages    | `yarn add <pkg>` ← **only valid terminal use besides scripts**                                  |
| Run tests           | `yarn test-headless [--include="**/file.spec.ts"]` ← **package.json script, not a raw command** |
| Regenerate DB types | `yarn updateBackendTypes` ← **package.json script, only after Supabase schema change**          |

**🚫 Never use terminal to:** read files · search patterns · check structure · apply edits  
**🚫 Never run raw test commands** — always invoke via `package.json` scripts (`yarn <script>`).  
**🚫 Never run:** `ng test` · `npx ng test` · `npm install` · any interactive/watch command  
**✅ Batch** all edits to the same file into a single tool call.  
**✅ Act autonomously** — never ask permission to explore; gather context with tools, then act.

---

## 🎯 Development Philosophy

- Understand requirements fully before implementing.
- Explore the codebase with file tools first — never guess.
- Implement incrementally: database → backend → UI → polish.
- Simple is better than fast.

---

## ⚠️ Critical Rules

> Examples live in [PATTERNS.md](./PATTERNS.md) and [STYLE_GUIDE.md](./STYLE_GUIDE.md). Do not duplicate them here.

### 1. Service Architecture
- Data services: `@Injectable()` — component-scoped, NOT root. Provided in component decorator.
- API services: `@Injectable({ providedIn: 'root' })`.

### 2. Subscription Management
- Every component and service **MUST extend `SubManager`** and call `super()` in constructor.
- Every subscription **MUST have `takeUntil(this.destroy$)`**.
- Prefer `async` pipe in templates — avoid manual subscriptions in components.

### 3. Naming Conventions

- Observables/Subjects: `$` suffix — `data$`, `loadData$`.
- Private BehaviorSubjects: `_` prefix — `_state$`.

### 4. Event-Driven Architecture (CRITICAL)
- All business logic lives in the constructor via reactive streams.
- Components emit to public Subjects (`.next()`), never call methods.
- No public methods for business logic.

### 5. UI Rules
- Inline UI with `BehaviorSubject<boolean>` toggles — no dialogs.
- Always `| async` pipe. Layout via `.row`, `.col`, `.gap1` from `tools.scss`.

### 6. Backend Calls
- Always through `SupabaseService` — never instantiate Supabase directly.
- Read: `backend.GET.*` (paginated/filtered lists) · `backend.get.*` (entity lookups, user-scoped). Use whichever
  matches existing usage.
- Write: `backend.add.*` · `backend.update.*` · `backend.delete.*`.
- New method checklist: register table in `DatabaseStrings.ts` → `cacheBust()` on writes → `@Cacheable` on reads.

### 7. Error Handling

Use `SharedConstants` — never call `snackBar.open()` directly. `success*` methods are direct calls; `errorHandler*`
methods are `catchError(...)` pipe operators that return `EMPTY`. Full method list in [PATTERNS.md](./PATTERNS.md).

---

## 📁 File Locations & Key Imports

```
Data services:  *-data.service.ts  (in component directory)
Components:     src/app/components/[feature]/
Models:         src/app/models/
Shared:         src/app/shared-interproject/
Backend:        src/app/features/backend/supabase.service.ts
Table names:    src/app/features/backend/DatabaseStrings.ts  ← register new tables here FIRST
DB types:       src/backend/database.types.ts
```

```typescript
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserManagementService } from 'src/app/features/backend/user-management.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
```

**Reference implementations:** `patch-detail-data.service.ts` · `module-detail-data.service.ts` ·
`rack-detail-data.service.ts` · `user-login-data.service.ts`

---

## 🚫 Common Mistakes

❌ `@Injectable({ providedIn: 'root' })` on data services  
❌ `Subject` instead of `ReplaySubject` for entity-ID triggers — late subscribers miss the emit  
❌ New backend write without `cacheBust([...keys])` — leaves stale cache  
❌ New backend method without registering table in `DatabaseStrings.ts` first  
❌ `destroyEvent$` — legacy; use `destroy$` from `SubManager`  
❌ Generating markdown summary/reference/docs files unless explicitly asked

---

## 📚 Checklists

**New Data Service:**

- extends `SubManager`, calls `super()` · `@Injectable()` no `providedIn`
- private `_` BehaviorSubjects · public `readonly` observables · public action Subjects
- all subscriptions `takeUntil(this.destroy$)` · `ReplaySubject` for entity-ID triggers

**New Component:**

- extends `SubManager`, calls `super()` · provides data service in `@Component({ providers: [...] })`
- `async` pipe in template · layout classes from `tools.scss` · no inline styles

**New Backend Method:**

- table in `DatabaseStrings.ts` · write has `cacheBust([...keys])` · read has `@Cacheable`
- `database.types.ts` updated; run `yarn updateBackendTypes` if schema changed

**Pre-finish:**

- no dead code / unused imports / commented-out blocks
- `$` suffix all observables · `_` prefix all private BehaviorSubjects
- all subscriptions `takeUntil(this.destroy$)` · no `destroyEvent$` · no open `TODO`/`FIXME`

---

## 🔄 Development Workflow

**Every session:**
1. **Explore first** — read relevant files with file tools before changing anything.
2. **Work until commit-ready** — never hand back with half-finished work.
3. **Run tests after every meaningful change** — most specific test command available.
4. **Cleanup pass** — run pre-finish checklist above.

**File ownership:**

| What                                          | Where                |
|-----------------------------------------------|----------------------|
| Agent rules & workflow preferences            | `FOR_AI_AGENTS.md`   |
| Active feature — steps, gotchas, test results | `CURRENT_FEATURE.md` |
| Backlog & completed history                   | `TODO.md`            |
| Product goals & strategy                      | `PRODUCT_NEEDS.md`   |

**CURRENT_FEATURE.md workflow:** Read at session start. Update inline as you work. On completion: summarise in TODO.md,
reset to Empty Template.

---

## Git — Conventional Commits (REQUIRED)

**Format:** `<type>(<scope>): <description>`

| Type       | When                |
|------------|---------------------|
| `feat`     | New feature         |
| `fix`      | Bug fix             |
| `refactor` | No behaviour change |
| `perf`     | Performance         |
| `style`    | Formatting only     |
| `test`     | Tests               |
| `docs`     | Docs/comments       |
| `chore`    | Build/tooling       |
| `revert`   | Revert              |

Scope: kebab-case Angular module/feature. Lowercase, imperative, no trailing period. One concern per commit. Breaking
change: `!` suffix + `BREAKING CHANGE:` footer.

**Never:** Vague messages · Mix unrelated changes · Commit to `main` directly · Stop before commit-ready

---

## 📣 Communication

✅ Explain changes directly and concisely · Validate with error checking after edits  
❌ No markdown summaries, reports, or reference guides unless explicitly requested  