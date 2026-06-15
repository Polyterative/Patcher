---
name: patcher-ui-debug
description: Use when an agent persona (bug-hunter, designer, frontend-dev) needs to see what the running Patcher app actually looks like — to reproduce a visual bug, validate a fix, or inspect runtime DOM/console state. Provides a headless snapshot helper plus the Sentry/Supabase MCP cookbook for runtime context.
---

# Patcher — UI debug & runtime legibility

The article ["Harness engineering"](https://openai.com/index/harness-engineering/) calls this **agent legibility**: anything the agent cannot see in-context effectively does not exist. This skill makes the running app, its console, its network calls, and its production errors directly inspectable from inside an agent run.

## When to invoke

- A bug report mentions a visual issue ("button overlaps", "list flashes on load").
- You need to confirm a UI fix actually rendered correctly before opening a PR.
- A user pasted a screenshot but the failure mode looks runtime-specific (console error, network failure).
- A Sentry issue ID is provided and you want full context, not just a stack.

## Preflight (one-time per session)

```bash
# 1. Make sure dev server is up. If not, the user will start it; do not start
#    a long-running server without explicit consent (see AGENTS.md §3).
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5556
# Expect: 200. If 000/connection refused, ask the user to run `pnpm start`.

# 2. Chromium must be installed (Playwright config does this for e2e, so it's
#    almost always already there).
pnpm exec playwright install chromium 2>/dev/null || true
```

## Snapshot a route

```bash
node scripts/dev/agent-snapshot.mjs --route /modules --out /tmp/snap
```

Emits to the output dir:
- `screenshot.png` — full-page screenshot.
- `dom.html` — rendered HTML.
- `a11y.json` — accessibility tree (great for "does this button exist with that label").
- `console.log` — browser console + page errors captured during load.
- `requests.log` — every network request + status code.
- `meta.json` — summary (URL, auth state, duration, counts).

For authenticated routes (rack editor, user area, admin), pass `--auth` after running `pnpm test:e2e:auth` once to seed `playwright/.auth/user.json`:

```bash
node scripts/dev/agent-snapshot.mjs --route /user/racks --auth --out /tmp/snap-user
```

After capturing, the agent should `view` the screenshot, grep the DOM for relevant testids, and scan `console.log` for errors before reasoning about the bug.

## Fetch a Sentry issue

The Sentry MCP is wired up — prefer it over asking the user to paste stack traces. Typical flow:

1. Get the issue ID from the user (e.g. `PATCHER-1A2B`) or list recent issues.
2. Pull event details + breadcrumbs for the most recent event in that issue.
3. Match the breadcrumb route + user action against an `agent-snapshot` of the same route to reproduce locally.

## Inspect Supabase state (read-only)

The Supabase MCP is read-only. Use for:
- Confirming whether a row actually exists (`select id, updated from racks where id = ?`).
- Reading advisor warnings (`get_advisors performance`).
- Tailing logs (`get_logs api`).

Never apply migrations / change RLS via MCP. See `AGENTS.md` §5.

## Composition with personas

- **bug-hunter** → snapshot the failing route → fetch Sentry context → write up root cause.
- **designer** → snapshot before-and-after to compare visuals; inspect a11y tree for label/role regressions.
- **frontend-dev** → after implementing a fix, snapshot the route to confirm DOM shape matches expectations, then run `pnpm test:e2e:auth` for the affected spec only.

## Limits

- Screenshots/DOM snapshots are static; complex multi-step interactions still belong in a Playwright spec under `e2e/`.
- The helper does not start the dev server. That stays an explicit user action.
- Output should go under `/tmp/` (git-ignored) — never commit snapshots.
