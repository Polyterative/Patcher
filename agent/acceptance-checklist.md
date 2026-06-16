# Acceptance Checklist

- [x] Row move actions add a short directional class to the affected rack rows and clear it automatically.
- [x] Row move polish is visual-only and does not change rack persistence, backend calls, or manual drag/drop behavior.
- [x] Focused rack visual model tests cover the new row move state/class behavior.
- [x] `pnpm test-headless --include="**/rack-visual-model.component.spec.ts"` passes.
- [x] Relevant docs/logs reflect the selected task and outcome.
