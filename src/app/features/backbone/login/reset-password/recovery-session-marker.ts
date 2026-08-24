/**
 * Tab-scoped proof that the current browser tab completed a genuine password-
 * recovery event for a specific (userId, sessionId) pair. Storage-backed so it
 * survives a same-tab reload/back-forward, but never a new tab/window (uses
 * `sessionStorage`, not `localStorage`) and never outlives its TTL.
 *
 * Deliberately contains no secret: never `token_hash`, `access_token`, or
 * `refresh_token` — only two non-secret identifiers plus a timestamp. This
 * gates UI rendering only; it grants no backend authority by itself (see
 * TechnicalAuthResilience.md §8).
 */
export interface RecoverySessionMarker {
  readonly userId: string;
  readonly sessionId: string;
  readonly createdAt: number;
}

export const RECOVERY_MARKER_TTL_MS = 30 * 60 * 1000;

const STORAGE_KEY = 'patcher.recovery-session-marker.v1';

function getSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    // sessionStorage can throw (e.g. disabled/blocked) — fail closed, never crash.
    return null;
  }
}

export function writeRecoveryMarker(userId: string, sessionId: string, now = Date.now()): void {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    const marker: RecoverySessionMarker = {userId, sessionId, createdAt: now};
    storage.setItem(STORAGE_KEY, JSON.stringify(marker));
  } catch {
    // Quota exceeded or storage otherwise unavailable — no marker persisted, fail closed.
  }
}

export function readValidRecoveryMarker(
  userId: string,
  sessionId: string,
  now = Date.now()
): RecoverySessionMarker | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RecoverySessionMarker> | null;
    if (
      !parsed ||
      typeof parsed.userId !== 'string' ||
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.createdAt !== 'number'
    ) {
      return null;
    }

    if (parsed.userId !== userId || parsed.sessionId !== sessionId) return null;
    if (now - parsed.createdAt >= RECOVERY_MARKER_TTL_MS) return null;

    return {userId: parsed.userId, sessionId: parsed.sessionId, createdAt: parsed.createdAt};
  } catch {
    // Malformed/corrupted storage contents — fail closed, never throw.
    return null;
  }
}

export function clearRecoveryMarker(): void {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore — nothing to clean up if storage is inaccessible
  }
}
