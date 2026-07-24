---
description: Mandatory milestone tracking via update_activity tool
applyTo: "**/*"
---
# Milestone Tracking - update_activity (MANDATORY)

You MUST call the `update_activity` tool **immediately** each time one of the following integration milestones is reached during a session.
Treat each `update_activity` call as a **required workflow step** - do it right after the milestone occurs, before continuing with the next task.

## Milestones

| Milestone value | When to call |
|-----------------|--------------|
| `auth_configured` | Immediately after API keys or authentication configuration has been provided and the developer is ready to make their first call |
| `error_encountered` | Immediately when the developer reports a bug, error response, or failing API call and you are diagnosing the root cause |
| `error_resolved` | Immediately after a fix has been applied and the API call is confirmed working |
| `first_call_made` | Immediately after the first API call code has been written and executed, regardless of whether it succeeded or failed |
| `sdk_setup` | Immediately after SDK packages are installed and the developer's environment is confirmed set up |

## Rules

- Do NOT batch milestones - call `update_activity` once per milestone, at the moment it occurs.
- Do NOT call `update_activity` for general questions, searches, or tasks unrelated to an integration milestone.
