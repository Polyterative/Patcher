---
name: ai-dlc
description: AWS AI-DLC (AI Development Life Cycle) formal phased workflow for software development — Inception (workspace detection, reverse engineering, requirements analysis, user stories, workflow planning, application design, units generation) → Construction (functional design, NFR, infrastructure design, code generation, build and test) → Operations. Use this skill ONLY when the user explicitly requests AI-DLC, references AIDLC phases by name (e.g., "do the inception phase", "run reverse engineering"), or asks to follow the structured AWS AI-DLC process. Do NOT load for normal Patcher development work — that uses the `patcher` skill instead.
---

# AI-DLC Workflow (Opt-In)

This skill is **opt-in**. The full 543-line workflow lives in `.aidlc-rule-details/` and is only loaded when the user explicitly asks for AI-DLC. Normal Patcher development should use the `patcher` skill instead.

## When the user opts in

1. Load `.aidlc-rule-details/common/process-overview.md` first — it contains the canonical workflow overview
2. Load `.aidlc-rule-details/common/session-continuity.md` for session resumption guidance
3. Load `.aidlc-rule-details/common/content-validation.md` for content validation rules
4. Load `.aidlc-rule-details/common/question-format-guide.md` for question formatting

## Extensions

Scan `.aidlc-rule-details/extensions/` recursively. Load ONLY `*.opt-in.md` files at start (NOT the full rule files). When the user opts IN for a specific extension, load its corresponding rule file (strip `.opt-in.md`, append `.md`). Extensions without an opt-in file are always enforced — load them immediately.

## Phase entry points

| Phase | Stage | Rule file |
|---|---|---|
| Inception | Workspace Detection (always) | `.aidlc-rule-details/inception/workspace-detection.md` |
| Inception | Reverse Engineering (brownfield only) | `.aidlc-rule-details/inception/reverse-engineering.md` |
| Inception | Requirements Analysis (always) | `.aidlc-rule-details/inception/requirements-analysis.md` |
| Inception | User Stories (conditional) | `.aidlc-rule-details/inception/user-stories.md` |
| Inception | Workflow Planning (always) | `.aidlc-rule-details/inception/workflow-planning.md` |
| Inception | Application Design (conditional) | `.aidlc-rule-details/inception/application-design.md` |
| Inception | Units Generation (conditional) | `.aidlc-rule-details/inception/units-generation.md` |
| Construction | Functional Design (conditional, per-unit) | `.aidlc-rule-details/construction/functional-design.md` |
| Construction | NFR Requirements (conditional, per-unit) | `.aidlc-rule-details/construction/nfr-requirements.md` |
| Construction | NFR Design (conditional, per-unit) | `.aidlc-rule-details/construction/nfr-design.md` |
| Construction | Infrastructure Design (conditional, per-unit) | `.aidlc-rule-details/construction/infrastructure-design.md` |
| Construction | Code Generation (always, per-unit) | `.aidlc-rule-details/construction/code-generation.md` |
| Construction | Build and Test (always) | `.aidlc-rule-details/construction/build-and-test.md` |
| Operations | (placeholder) | — |

## Hard rules when AI-DLC is active

- Display the welcome message from `.aidlc-rule-details/common/welcome-message.md` once at workflow start
- Log every user input (raw, never summarized) and AI response in `aidlc-docs/audit.md` with ISO 8601 timestamps
- **APPEND** to `audit.md` — never overwrite it
- Update plan-level checkboxes inline as work completes
- Wait for explicit user approval at every stage gate — do NOT auto-proceed
- Track stage progress in `aidlc-docs/aidlc-state.md`
- Validate Mermaid / ASCII content per `.aidlc-rule-details/common/content-validation.md` before file creation

## Coexistence with Patcher rules

AI-DLC defines its own directory layout (`aidlc-docs/`, plus application code at workspace root). When running AI-DLC inside the Patcher repo, application code still goes to the existing Patcher structure (`src/app/...`) — only the `aidlc-docs/` planning artifacts use AI-DLC's layout. Patcher's `AGENTS.md` rules (pnpm, layering, naming, git policy) remain in effect.
