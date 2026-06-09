# Module I/O — Bidirectional and Passive Port Support

## Problem

The current I/O model treats every port as either an **input** or an **output**.
This is insufficient for real-world Eurorack modules where ports can be:

- **Bidirectional** — e.g. CV I/O jacks that act as input or output depending on
  context (patch cables plugged in either direction), clock I/O, or expander
  communication buses.
- **Passive / utility** — e.g. mults (passive multiples), attenuators, and utility
  panels that have no fixed signal direction.

Right now these ports are either omitted from data or mis-classified, causing
inaccurate patch-connection suggestions and analytics.

## Goal

Extend the port / I/O data model and UI to support a third direction value
(`bidirectional` / `passive`) without breaking existing input/output logic.

## Scope

- [ ] **Data model** — add `direction` enum value(s) to the ports schema
  (`inputs` / `outputs` / `bidirectional` / `passive` — or a separate `is_passive` flag).
- [ ] **Admin / module-editor** — expose the new value(s) in the port editing UI.
- [ ] **Patch editor** — allow connections where either end is bidirectional/passive.
- [ ] **Analytics & tag hints** — treat bidirectional ports neutrally (don't skew
  input or output counts).
- [ ] **Display** — render a distinct icon or label for bidirectional/passive ports
  on the module detail page.

## Out of scope (first pass)

- Automatic inference of port direction from module tags or description text.
- Breaking changes to existing input/output port records.

## Open questions

1. Single `bidirectional` value vs separate `passive` enum entry — passive modules
   like mults have no active signal path at all, which is semantically different
   from a bidirectional active port.
2. Schema location: extend the existing `direction` column vs add a `port_flags`
   JSONB column for future extensibility.
3. How patch-cable direction validation should work when one port is bidirectional.

## Decision log

_No decisions recorded yet._
