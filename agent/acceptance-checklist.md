# Acceptance Checklist

- [x] Replace-with-blank requests suppress staggered enter delay for the affected rack slot.
- [x] Suppression is transient and does not affect neighboring modules.
- [x] Focused rack visual model tests cover the delay helper behavior.
- [x] `pnpm test-headless --include="**/rack-visual-model.component.spec.ts"` passes.
- [x] Relevant docs/logs reflect completion.
