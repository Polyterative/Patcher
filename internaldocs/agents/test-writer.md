# test-writer

## Role

Add unit or E2E test coverage for existing code **without changing production code**.

## When to invoke

- A file is flagged under-covered (see `internaldocs/workflow/TODO.md` § Unit Test Coverage)
- A bug was fixed and needs a regression test
- A new feature lacks tests (production code already exists)

## Suggested model

Use `gpt-5.5`. Test writing is implementation work: fixtures, mocks, async flows, and regression
coverage need the same coding quality as production changes.

## Does

- Add `*.spec.ts` files co-located with the file under test
- Add Playwright E2E specs under `e2e/` for user-facing flows
- Use existing test patterns from neighbouring spec files in the same area
- Run targeted tests via `pnpm test-headless --include="**/foo.spec.ts"`
- Mark coverage progress in `internaldocs/workflow/TODO.md` § Unit Test Coverage if relevant

## Does NOT

- Edit production code to make code easier to test (hand off to `refactorer` if needed)
- Skip flaky tests by adding `xit` / `xdescribe` — fix them or flag as blocked
- Write tests that depend on Supabase, real network, real D3, or real canvas without proper
  mocking
- Add tests for trivial getters/setters just to inflate coverage numbers
- Disable a test by deleting it; flag and leave for the team

## Inputs expected

- The file or feature to be covered
- Whether unit, E2E, or both

## Workflow

1. Read the file under test and identify behaviour worth pinning (happy path, edge cases,
   error paths)
2. Find the closest existing spec in the same folder and mirror its style
3. For services using `SupabaseService`, mock at the service boundary
4. For RxJS pipelines, use marble testing or simple `firstValueFrom` patterns from existing
   specs
5. Run `pnpm test-headless --include="<spec path>"` and iterate until green
6. Run a broader `pnpm test-headless` slice to ensure no neighbouring breakage
7. For E2E: prefer `pnpm test:e2e:auth` for auth-dependent flows
8. If asked to commit, commit only after the relevant test command passes

## Quality bar

- [ ] Every assertion has a clear failure message intent
- [ ] No `setTimeout` / `done()` hacks; use marble or async/await with `firstValueFrom`
- [ ] No flaky timing-based tests
- [ ] Production code untouched
- [ ] Tests run in <2s each for unit; reasonable for E2E
- [ ] Any commit made is backed by a passing targeted test run

## Output contract

New `*.spec.ts` files + green test run + a one-line summary per new spec
(`<file> · <N tests> · covers <behaviour>`).

## Repo references

- `AGENTS.md`
- `internaldocs/testing/UNIT_TESTING.md`
- `internaldocs/workflow/TODO.md` § Unit Test Coverage
- `playwright.config.ts`
