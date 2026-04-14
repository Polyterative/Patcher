# Comment Feature — Rework Analysis & Improvement Proposal

> **Status:** Proposal (not yet started)
> **Scope:** All comment-related code across the application — backend queries, data service, UI components, user area.
> **Source:** Analysis run 2026-04-08 via automated codebase exploration.

---

## 1. Feature Map (current state)

### Files involved

| Layer | File | Role |
|---|---|---|
| DB types | `src/backend/database.types.ts` | `comments` table shape |
| Model | `src/app/models/comment.ts` | `DbComment` interface |
| DB paths | `src/app/features/backend/DatabaseStrings.ts` | `DbPaths.comments` |
| Queries | `src/app/features/backend/supabase-queries.ts` | `getComments()`, `getCurrentUserComments()` |
| Add | `src/app/features/backend/supabase-add.ts` | `add.comment()` |
| Delete | `src/app/features/backend/supabase-delete.ts` | `delete.comment()`, `delete.commentsForRack()` |
| Data service | `src/app/components/shared-atoms/comments/comments-data.service.ts` | State + business logic for entity detail pages |
| User area service | `src/app/features/routes/user-area/user-area-data.service.ts` | State for user's own comment history |
| Root component | `src/app/components/shared-atoms/comments/comments-root/` | Comment list + editor shell |
| Item block | `src/app/components/shared-atoms/comments/comments-root/comments-item-block/` | Renders list or empty state |
| Item | `src/app/components/shared-atoms/comments/comments-item/` | Single comment card |
| Context | `src/app/components/shared-atoms/comments/comment-context/` | Shows entity the comment belongs to |
| Text pipe | `src/app/components/shared-atoms/comments/comment-text.pipe.ts` | DOMPurify + HTML-encode + linkify |
| Editor stub | `src/app/components/shared-atoms/comments/comments-editor/` | **Dead code — empty component** |
| User area UI | `src/app/features/routes/user-area/user-comments/` | Paginated view of user's own comments |
| Tests | `src/app/features/backend/__tests__/supabase-service/` | `add-comment-rack.spec.ts`, `get-current-user-comments.spec.ts` |

### Data model

```
comments
  id          number  PK
  authorId    string  FK → profiles.id
  content     string
  entityId    number  polymorphic FK (module, rack, patch, profile)
  entityType  number  enum: RESERVED=0, MODULE=1, RACK=2, PATCH=3, PROFILE=10
  created     string  timestamp
  updated     string  timestamp
  deletedAt?  string  (in model but not in DB schema — soft-delete not implemented)
```

Entity types are driven by `CommentableEntityTypes` enum in `comments-data.service.ts`.

### Where comments appear

| Surface | Entity type | Source method |
|---|---|---|
| Module detail page | `MODULE (1)` | `getComments(entityId, entityType)` |
| Rack detail page | `RACK (2)` | `getComments(entityId, entityType)` |
| Patch detail page | `PATCH (3)` | `getComments(entityId, entityType)` |
| User area → My Comments | current user | `getCurrentUserComments(from, to)` |

---

## 2. What already works well

- **Strong input validation** — 3–1000 char limits, `Validators.minLength`, `Validators.maxLength`,
  `CustomValidators.onlyCleanHtml`, `CustomValidators.notEmpty` all applied.
- **Solid render security** — `CommentTextPipe` strips HTML via DOMPurify, HTML-encodes special characters, then safely
  linkifies `http/https` URLs with `rel="noopener noreferrer"`. No XSS surface.
- **Caching is correct** — both `getComments` and `getCurrentUserComments` are decorated with `@Cacheable` (5-min and
  15-min TTLs respectively). `add.comment()` and `delete.comment()` both bust `['comments',
  'currentUserComments']`.
- **Subscription hygiene** — every subscription in the data service uses `takeUntil(this.destroy$)`. No leaks.
- **Component isolation** — `CommentsDataService` is provided per component, so module/rack/patch detail pages each
  have independent state.
- **User area pagination** — `getCurrentUserComments()` correctly uses `.range(from, to)`, `.order('created',
  {ascending: false})`, and `{count: 'exact'}`. The UI wires a `mat-paginator` (10 / 20 / 50 per page).
- **Auth enforcement** — all write operations require a user session; deletes are restricted to comment author via
  server-side `.filter('authorId', 'eq', user.id)`.
- **Timed delete window** — comment owner can delete within 30 minutes of creation; after that the button disappears.
  Good moderation default.
- **Empty state** — "No comments yet" shown when list is empty.
- **Loading indicator** — `lib-auto-update-loading-indicator` used throughout.

---

## 3. Bugs & issues

### 🔴 Critical — fix before next release

#### C-1 · `getComments()` has no sort order

**File:** `supabase-queries.ts` → `getComments()` (lines ~420-433)

The query fetches comments for an entity (module, rack, patch) without an `.order()` call. PostgREST returns rows in
undefined storage order — effectively random. Users see comments in a different, inconsistent sequence each session.

**Fix:** Add `.order('created', { ascending: false })` so newest comments appear first. This matches the behaviour
already implemented in `getCurrentUserComments()`.

```typescript
// Before
this.supabase.from(DbPaths.comments)
  .select(`*,profile:profiles(id,username)`)
  .filter('entityId', 'eq', entityId)
  .filter('entityType', 'eq', entityType)

// After
this.supabase.from(DbPaths.comments)
  .select(`*,profile:profiles(id,username)`)
  .filter('entityId', 'eq', entityId)
  .filter('entityType', 'eq', entityType)
  .order('created', { ascending: false })
```

---

#### C-2 · `getComments()` is unbounded — no pagination on entity detail pages

**File:** `supabase-queries.ts` → `getComments()`

Every call loads **all** comments for a module, rack, or patch in a single request. A popular module could
accumulate hundreds or thousands of comments. The current implementation would load all of them at once,
causing slow page loads, high memory usage, and large bandwidth costs.

**Contrast with `getCurrentUserComments()`** which correctly uses `.range(from, to)`.

**Fix (short-term):** Add a hard initial limit (e.g. 50) to cap the worst case while keeping the API simple.

```typescript
getComments(entityId: number, entityType: number, from = 0, to = 49) {
  return rxFrom(
    this.supabase.from(DbPaths.comments)
      .select(`*,profile:profiles(id,username)`, { count: 'exact' })
      .filter('entityId', 'eq', entityId)
      .filter('entityType', 'eq', entityType)
      .order('created', { ascending: false })
      .range(from, to)
  ).pipe(map(x => ({ data: x.data, count: x.count })));
}
```

**Fix (proper):** Expose `from/to` parameters, update `CommentsDataService` to hold `count$` and pagination
subjects, add a paginator (or "load more" button) to `comments-root.component.html`. See section 4 for the full
architectural approach.

---

#### C-3 · Error handling disabled in `getComments()`

**File:** `supabase-queries.ts` → `getComments()` (line ~430)

`remapErrors()` is commented out:

```typescript
.pipe(
  // remapErrors(),   ← commented out
  map(x => x.data)
)
```

Network failures and PostgREST errors are swallowed silently. The comment list will appear to load indefinitely
(stuck on loading indicator) with no user feedback.

**Fix:** Uncomment `remapErrors()` so errors surface through the observable pipeline and can be handled in the
template or data service.

---

### 🟡 Major — important UX gaps

#### M-1 · Patch context not implemented in `CommentContextComponent`

**File:** `comment-context.component.ts` (lines ~93-116)

The `case this.entityTypes.PATCH` branch is commented out. When a user views their comment history in the user
area, comments on patches show no context link — they appear as orphaned text with no way to navigate back to
the patch.

**Fix:** Implement the `PATCH` case using the same pattern as `MODULE` and `RACK`:

```typescript
case this.entityTypes.PATCH:
  this.backend.GET.patchWithId(this.data.entityId, ...)
    .pipe(map(x => x.data), takeUntil(this.destroy$))
    .subscribe(patch => {
      this.contextInformation$.next({
        label: patch?.name ?? 'Patch',
        routerLink: ['/patches', this.data.entityId]
      });
    });
  break;
```

The exact `GET.patchWithId` signature and router path should be confirmed against the existing patch detail
route.

---

#### M-2 · No optimistic UI update on comment submission

**File:** `comments-data.service.ts` submit pipeline (lines ~110-125)

Current flow:
1. User clicks "Submit comment"
2. App waits for server round-trip
3. Cache busted → `requestCommentsUpdate$` fires → second server round-trip to re-fetch list
4. Comment appears

This means a 500-1500ms blank window where the user's comment is in limbo. Users may double-submit.

**Preferred fix:** Insert the new comment into `comments$` immediately using the current user's profile data,
then confirm or rollback on server response. A simpler intermediate fix is to show an inline spinner on the
submit button and disable re-submission while in-flight.

---

### 🟠 Moderate — UX improvements

#### Mo-1 · Character counter appears too late

**File:** `comments-root.component.html` (line ~16)

```html
[hint]="control.value.length < maxLength/3 ? '' : control.value.length + ' /' + maxLength"
```

The counter is hidden until the user types ≥334 characters (1/3 of 1000). Users have no feedback on how much
space they have until they're already deep into writing.

**Fix:** Show the counter from the first keystroke (or at least from a lower threshold such as 10% / 100 chars).
A coloured progress approach (grey → amber at 80% → red at 95%) gives better at-a-glance feedback.

---

#### Mo-2 · No delete confirmation

**File:** `comments-item.component.html`

The delete button immediately fires `deleteComment$.next(data.id)` with no confirmation step. Given the strict
30-minute delete window, an accidental tap is permanent.

**Fix:** Open a small confirmation dialog (or inline `MatSnackBar` with an undo action) before committing
the delete.

---

#### Mo-3 · Comments may flash stale data during entity navigation

**File:** `comments-data.service.ts` / host components (module detail, rack detail)

When a user navigates from module A to module B, `requestCommentsUpdate$` emits the new entity reference which
triggers `tap(() => this.comments$.next(undefined))` — clearing the list. However, if the cached response for
module B is returned synchronously from the `@Cacheable` decorator before the `tap` emits, the stale module A
comments might be briefly visible.

This is low-risk currently because each host component provides a fresh `CommentsDataService` instance per
route. Worth verifying that the `requestReset$` subject is properly wired in all host components.

---

### 🟢 Minor — hygiene

#### Mi-1 · Dead code: `CommentsEditorComponent`

**File:** `src/app/components/shared-atoms/comments/comments-editor/comments-editor.component.ts`

This component is an empty stub — it exists but is not used anywhere. The actual comment editor is inlined in
`comments-root.component.html`. Remove the file and its module declaration to avoid confusion.

---

#### Mi-2 · `track item` should be `track item.id`

**File:** `comments-item-block.component.html`

```html
@for (item of data; track item; ...)
```

Tracking by object reference means Angular will re-render all items if the array reference changes (e.g. after a
cache-bust re-fetch). Tracking by stable numeric `id` preserves existing DOM nodes.

```html
@for (item of data; track item.id; ...)
```

---

#### Mi-3 · `deletedAt` field in model but not in DB schema

**File:** `src/app/models/comment.ts`

`DbComment.deletedAt?: string` is declared but the column does not exist in `database.types.ts`. Either
implement soft-delete in the DB (add the column, update delete logic) or remove the field from the model to
avoid misleading future developers.

---

## 4. Proposed architecture for entity-level pagination

The right long-term solution for C-2 is to add proper `from/to` parameters and a "load more" button (not a
full paginator, since comments are a chronological feed, not a table):

### Backend changes

```typescript
// supabase-queries.ts
getComments(
  entityId: number,
  entityType: number,
  from = 0,
  to = 24           // first page: 25 comments
): Observable<{ data: DbComment[] | null; count: number | null }> {
  return rxFrom(
    this.supabase.from(DbPaths.comments)
      .select(`*,profile:profiles(id,username)`, { count: 'exact' })
      .filter('entityId', 'eq', entityId)
      .filter('entityType', 'eq', entityType)
      .order('created', { ascending: false })
      .range(from, to)
  ).pipe(
    remapErrors(),
    map(x => ({ data: x.data, count: x.count }))
  );
}
```

### Data service changes (`CommentsDataService`)

Add:
- `commentsCount$ = new BehaviorSubject<number>(0)`
- `commentsPagination = { skip$: new BehaviorSubject(0), take$: new BehaviorSubject(25) }`
- `loadMore$` subject that increments `skip$` and appends (not replaces) results into `comments$`

### UI changes (`comments-root.component.html`)

Add below the comment list:
```html
@if ((dataService.commentsCount$ | async) > (dataService.comments$ | async)?.length) {
  <button mat-stroked-button (click)="dataService.loadMore$.next()">
    Load more comments
  </button>
}
```

This is consistent with how similar "feed" UIs work in the app.

---

## 5. Recommended work order

| # | Priority | Effort | Item |
|---|---|---|---|
| 1 | 🔴 Critical | XS | C-1: Add `.order()` to `getComments()` |
| 2 | 🔴 Critical | XS | C-3: Uncomment `remapErrors()` in `getComments()` |
| 3 | 🔴 Critical | S | C-2: Add `.range()` + `{count: 'exact'}` + update data service |
| 4 | 🟡 Major | S | M-1: Implement patch context in `CommentContextComponent` |
| 5 | 🟡 Major | M | M-2: Optimistic update or in-flight submit spinner |
| 6 | 🟠 Moderate | XS | Mo-1: Show char counter from first keystroke |
| 7 | 🟠 Moderate | S | Mo-2: Delete confirmation dialog |
| 8 | 🟢 Minor | XS | Mi-2: Fix `track item.id` |
| 9 | 🟢 Minor | XS | Mi-1: Delete `CommentsEditorComponent` stub |
| 10 | 🟢 Minor | XS | Mi-3: Remove or implement `deletedAt` in model |

Items 1-3 are essentially one commit (`supabase-queries.ts` + `comments-data.service.ts`).
Items 1-3 + 8-10 can be shipped as a fast "comment bug-fix" PR without any UI design decisions.
Items 4-7 are the "comment UX improvement" phase that requires a bit more design thought.

---

## 6. Longer-term ideas (not scoped yet)

- **Realtime updates** — subscribe to Supabase realtime channel for the `comments` table filtered by
  `entityId/entityType`. New comments from other users appear without a page refresh. Requires Supabase realtime
  to be enabled for the table.
- **Comment editing** — currently comments are immutable after posting (30-min delete window is the only escape
  hatch). Adding an edit flow (within the same 30-min window, or unlimited) with an `updated` timestamp shown
  would improve the experience.
- **Reply threads** — flat comments work fine at low volumes; a nested reply model becomes valuable once
  community engagement grows. Requires a `parentId` FK on the table.
- **Sorting toggle** — let users switch between "newest first" and "oldest first" at the component level.
- **Report / flag** — community moderation for inappropriate content. Likely a separate feature (flag table +
  admin review queue).
- **Soft delete** — properly implement `deletedAt` column with a DB migration and update the delete operation
  to set the timestamp rather than hard-delete. Allows "comment was removed" placeholders in threads.
