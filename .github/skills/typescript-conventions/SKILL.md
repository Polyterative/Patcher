---
name: typescript-conventions
description: Apply technology-agnostic, pragmatic TypeScript conventions centered on readability, safety, and testability without being overly prescriptive. Use when writing, refactoring, or reviewing TypeScript/TSX, designing types/APIs, or resolving type errors.
---

# TypeScript Conventions (Pragmatic)

## Goal

Write TypeScript that is **readable, safe, maintainable, and testable**, while matching the repo's existing style and constraints.

## Common conventions (non-prescriptive)

Use these as defaults when they fit; follow the repo when they don't.

- **Consistency first**: mirror nearby patterns, naming, exports, and tooling (lint/format).
- **Clarity at boundaries**: be explicit where data crosses a boundary (exports, I/O, env, API calls).
- **Simple, communicative types**: model the domain clearly; prefer readability over clever types.
- **Type safety without drama**: avoid unsafe assertions; when input is untrusted, use `unknown` and narrow/validate.
- **Intentional errors**: throw `Error` objects, add helpful context, and avoid silently swallowing failures.
- **Testable design**: keep core logic deterministic; isolate side effects; inject dependencies rather than hard-coding globals.

## Type modeling (quick notes)

- Teams often use **unions / discriminated unions** for domain states, and handle cases exhaustively when it improves correctness.
- For constants/lookup tables, teams often use **`as const`** to preserve literal types.
- Prefer immutability/pure logic when it makes reasoning easier; don't force it if it reduces clarity.
