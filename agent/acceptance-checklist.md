# Acceptance Checklist

## Patch Editing — "No connections" warning fix

- [x] `patch-details.component.html` outer bag uses `editorConnections$` as the connections source so the empty state clears immediately when a connection is added during editing
- [x] When not editing, display behaviour is unchanged (`editorConnections$` is synced from `patchConnections$` on patch load)
- [x] No regression in loading indicator (null check still works — `editorConnections$` starts as `null` just like `patchConnections$`)
- [x] Unit test covering the stale-source scenario: adding a connection via `confirmSelectedConnection$` updates `editorConnections$` and `patchConnections$` stays at backend value
- [x] Build green, lint green, focused tests green (25/25)
