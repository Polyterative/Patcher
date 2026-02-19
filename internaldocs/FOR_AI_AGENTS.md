# For AI Coding Agents

> **Rules for AI agents using this file:**
> 1. **Read this file first** — it governs all other files and overrides nothing.
> 2. **Do not duplicate** code patterns here; canonical patterns live
     in [PATTERNS.md](./PATTERNS.md), [STYLE_GUIDE.md](./STYLE_GUIDE.md), and [ARCHITECTURE.md](./ARCHITECTURE.md).
> 3. **Capture new guidelines here** — if the user expresses a workflow preference or decision principle, add it to the
     appropriate section, format it clearly, and confirm with the user.
> 4. **Product status → [PRODUCT_NEEDS.md](./PRODUCT_NEEDS.md). Active tasks → [TODO.md](./TODO.md).**

---

## 🎯 Development Philosophy

- Take time to understand requirements fully before implementing
- Verify current state before making changes (explore codebase first)
- Implement incrementally: database → backend → UI → polish
- Simple is better than fast — build correctly, not quickly

---

## 🤖 Autonomy & Tool Priority

**Maximize tool use, minimize terminal calls. Never run interactive commands.**

- **Prefer file tools over terminal:** Use `read_file`, `insert_edit_into_file`, `replace_string_in_file`,
  `grep_search`, `file_search`, `list_dir`.
- **Terminal is only for:** Installing packages (`yarn add …`), running tests (`yarn test-headless`), or things that
  cannot be done with file tools alone.
- **Never use terminal to:** Read files, search for patterns, check directory structure, or apply code changes.
- **Batch file edits:** Group all changes to the same file into a single tool call.
- **Autonomous by default:** Do not ask for permission to read files or explore the codebase. Gather context with tools,
  then act.

---

## ⚡ Commands (MUST READ)

| Action               | Command                                             |
|----------------------|-----------------------------------------------------|
| Install              | `yarn` / `yarn add <pkg>` / `yarn remove <pkg>`     |
| Test (always)        | `yarn test-headless`                                |
| Test (specific file) | `yarn test-headless --include="**/my-file.spec.ts"` |

**🚫 NEVER:** `ng test`, `npx ng test`, `npm install`, any interactive/watch test command.

---

## ⚠️ Critical Rules

> Code examples for all of these rules are in [PATTERNS.md](./PATTERNS.md) and [STYLE_GUIDE.md](./STYLE_GUIDE.md). Do
> not duplicate them here.

### 1. Service Architecture

- Data services: `@Injectable()` — component-scoped, NOT root. Provided in component decorator.
- API services: `@Injectable({ providedIn: 'root' })`.
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for layer diagram.

### 2. Subscription Management

- Every component and service **MUST extend `SubManager`** and call `super()` in constructor.
- Every subscription **MUST have `takeUntil(this.destroy$)`**.
- Prefer `async` pipe in templates — avoid manual subscriptions in components entirely.

### 3. Naming Conventions

- Observables and Subjects: `$` suffix — `data$`, `loadData$`, `submitForm$`.
- Private BehaviorSubjects: `_` prefix — `_state$`.
- See [STYLE_GUIDE.md](./STYLE_GUIDE.md) for full table.

### 4. Event-Driven Architecture (CRITICAL)

- All business logic lives in the constructor via reactive streams.
- Components emit to public Subjects (`.next()`), never call methods.
- No public methods for business logic — use Subjects.
- See [PATTERNS.md](./PATTERNS.md) for all event patterns.

### 5. UI Rules

- Inline UI with `BehaviorSubject<boolean>` toggles — no dialogs.
- Always `| async` pipe. Layout via `.row`, `.col`, `.gap1` from `tools.scss`.

### 6. Backend Calls

- Always through `SupabaseService` — never instantiate Supabase directly.
- **Two read namespaces** — `backend.GET.*` for paginated/filtered list queries; `backend.get.*` for entity lookups and
  user-scoped queries. Both are correct; use the one that matches what already exists for that entity.
- Write namespaces: `backend.add.*`, `backend.update.*`, `backend.delete.*`.
- Full namespace table → [PATTERNS.md — API Calls](./PATTERNS.md).
- When adding a new backend method: register table in `DatabaseStrings.ts` first, add `cacheBust()` on writes, add
  `@Cacheable` on reads. See [PATTERNS.md — Adding a New Backend Method](./PATTERNS.md).

### 7. Error Handling

- `SharedConstants.successSave(snackBar)` / `SharedConstants.errorCustom(snackBar, 'msg')` — no raw snackBar calls.
- `catchError` must `return EMPTY` (or `of(fallback)`), never swallow errors silently.

---

## 📁 File Locations & Key Imports

```
Data services:  *-data.service.ts  (in component directory)
Components:     src/app/components/[feature]/
Models:         src/app/models/
Shared:         src/app/shared-interproject/
Backend:        src/app/features/backend/supabase.service.ts
Table names:    src/app/features/backend/DatabaseStrings.ts  ← register new tables here FIRST
DB types:       src/backend/database.types.ts               ← update when adding new tables
```

```typescript
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserManagementService } from 'src/app/features/backend/user-management.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
```

**Copy patterns from:**

- `patch-detail-data.service.ts` — full real-world data service with `ReplaySubject` trigger, privacy toggle, connection
  editing
- `module-detail-data.service.ts` — entity detail with `updateSingleModuleData$` trigger pattern
- `rack-detail-data.service.ts` — rack editor state management
- `user-login-data.service.ts` — auth flow patterns

---

## 🚫 Common Mistakes

❌ `@Injectable({ providedIn: 'root' })` on data services  
❌ No `takeUntil(this.destroy$)`  
❌ Not extending `SubManager` or calling `super()`  
❌ Missing `$` suffix  
❌ Using dialogs instead of inline UI  
❌ Subscribing in components (use `async` pipe)  
❌ Not using `readonly` on public observables  
❌ Using `npm` instead of `yarn`  
❌ Running `ng test` instead of `yarn test-headless`  
❌ Direct Supabase calls  
❌ Public methods for logic (use Subjects)  
❌ Components calling methods (emit to Subjects)  
❌ Subscribing outside constructor  
❌ Generating markdown summary/reference/docs files  
❌ Using terminal to read files or search code (use file tools)  
❌ Asking permission to explore the codebase (just do it)  
❌ Vague commit messages (`fix stuff`, `WIP`)  
❌ Writing a new backend method without registering the table in `DatabaseStrings.ts` first  
❌ Writing a new add/update/delete method without `cacheBust([...keys])` — leaves stale cache  
❌ Using `Subject` instead of `ReplaySubject` for entity-ID triggers on detail pages — child components that subscribe
late will miss the emit  
❌ Using `destroyEvent$` — this is a legacy pattern in older services. New services must extend `SubManager` and use
`this.destroy$`

---

## 📚 Checklists

**Data Service:**
- [ ] Extends `SubManager`, calls `super()`
- [ ] `@Injectable()` — no `providedIn`
- [ ] Private `_BehaviorSubjects`, public `readonly` observables, public action Subjects
- [ ] All subscriptions have `takeUntil(this.destroy$)`

**Component:**
- [ ] Extends `SubManager`, calls `super()`
- [ ] Provides data service in decorator `providers: [MyDataService]`
- [ ] Uses `async` pipe and layout classes from `tools.scss`

**Pre-finish cleanup:**

- [ ] Remove dead code, unused imports, commented-out blocks
- [ ] Verify `$` suffix and `_` private prefix on all observables
- [ ] All subscriptions have `takeUntil(this.destroy$)`
- [ ] No `TODO`/`FIXME` left unaddressed from current session
- [ ] Templates use `async` pipe and layout classes — no inline styles

---

## 🔄 Development Workflow

**Every session MUST follow this cycle:**

1. **Explore first** — read relevant files with file tools before changing anything.
2. **Work until commit-ready** — keep going until all changes are complete and tested. Never hand back with
   half-finished work.
3. **Run tests after every meaningful change** — use the most specific test command available.
4. **Cleanup pass before finishing** — run the pre-finish checklist above.

---

## Git — Conventional Commits (REQUIRED)

**Format:** `<type>(<scope>): <description>`

| Type       | When                                   |
|------------|----------------------------------------|
| `feat`     | New feature or user-visible capability |
| `fix`      | Bug fix                                |
| `refactor` | Code change with no behavior change    |
| `perf`     | Performance improvement                |
| `style`    | Formatting/whitespace only             |
| `test`     | Adding or updating tests               |
| `docs`     | Documentation only (`.md`, comments)   |
| `chore`    | Build, tooling, dependency updates     |
| `revert`   | Reverting a previous commit            |

**Scope:** Angular module or feature in kebab-case (`module-editor`, `rack-parts`, `supabase`, `auth`). Omit only for
truly cross-cutting changes.

**Rules:** Lowercase, imperative mood, no trailing period. One concern per commit. Breaking changes: append `!` after
type/scope, add `BREAKING CHANGE:` footer.

```
feat(module-browser): add "Others by manufacturer" section
fix(module-editor): remove duplicate backend call in savePhysical$
refactor(module-browser): replace deprecated fxLayout with CSS classes
test(patch-detail): add privacy toggle integration tests
docs(internaldocs): compress PRODUCT_NEEDS, add TODO with rules headers
```

**Never:** Vague messages | Mix unrelated changes | Commit to `main` directly | Stop before commit-ready

---

## 📣 Communication

✅ Explain changes directly and concisely  
✅ Validate with error checking after edits  
❌ No markdown summaries, reports, or reference guides unless explicitly requested