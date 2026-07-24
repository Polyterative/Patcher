---
description: Require automated tests for every TypeScript change (TDD)
applyTo: "**/*.ts,**/*.tsx"
---
# Automated Tests Required (TypeScript)

For **any new or updated TypeScript implementation**, you MUST add or update **executable automated tests** (even if the user didn't explicitly ask).

## Requirements

- **No markdown-only substitutes**: do NOT create `TESTS.md`, comments, or prose-only test plans instead of real tests unless the user explicitly requests manual test cases.
- **Framework**:
  - Prefer the project's existing test framework (e.g. Jest, Vitest, Mocha).
  - If no framework exists, introduce a reasonable default with a runnable test command.
- **Location**:
  - Place tests alongside code or under the project's established test directory (`tests/`, `__tests__/`, etc.).
- **Isolation**:
  - Mock or stub external dependencies by default.
  - Avoid real network, filesystem, clock, or environment dependencies unless explicitly requested.

## Coverage Requirements

Automated tests MUST cover:

- **Happy paths**: expected and normal behavior
- **Boundary conditions**: limits, min/max values, empty states, large inputs
- **Invalid inputs**: wrong types, missing fields, malformed data
- **Failure scenarios**: network/IO failures, thrown errors, permission issues, timeouts
- **Regressions**: previously failing cases or logic likely to break again

## External Dependencies

- External APIs and services must be mocked or stubbed by default.
- Integration or end-to-end tests may only be added when explicitly requested or guarded by environment flags.

## Clarity Rules

- **Avoid assumptions**: rely strictly on stated requirements and observable code behavior.
- **If requirements are unclear**:
  - Ask targeted, structured clarification questions
  - Do NOT invent behavior
  - Wait for confirmation before finalizing tests

## When Generating or Modifying Code

- Tests must be written or updated alongside production code.
- Tests must be deterministic, repeatable, and readable.
- Prefer explicit assertions over vague expectations.
