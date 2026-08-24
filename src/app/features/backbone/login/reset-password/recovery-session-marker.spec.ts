import {
  clearRecoveryMarker,
  RECOVERY_MARKER_TTL_MS,
  readValidRecoveryMarker,
  writeRecoveryMarker
} from './recovery-session-marker';


describe('recovery session marker', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('reads back a marker with the same userId/sessionId immediately after writing it', () => {
    writeRecoveryMarker('user-1', 'session-abc', 1000);

    const marker = readValidRecoveryMarker('user-1', 'session-abc', 1500);

    expect(marker).toEqual({userId: 'user-1', sessionId: 'session-abc', createdAt: 1000});
    expect(Object.keys(marker!).sort()).toEqual(['createdAt', 'sessionId', 'userId']);
  });

  it('returns null when the live sessionId does not match the stored marker', () => {
    writeRecoveryMarker('user-1', 'session-A', 1000);

    const marker = readValidRecoveryMarker('user-1', 'session-B', 1500);

    expect(marker).toBeNull();
  });

  it('returns null when the live userId does not match the stored marker', () => {
    writeRecoveryMarker('user-1', 'session-A', 1000);

    const marker = readValidRecoveryMarker('user-2', 'session-A', 1500);

    expect(marker).toBeNull();
  });

  it('returns null once RECOVERY_MARKER_TTL_MS has elapsed since createdAt', () => {
    writeRecoveryMarker('user-1', 'session-A', 0);

    expect(readValidRecoveryMarker('user-1', 'session-A', RECOVERY_MARKER_TTL_MS + 1)).toBeNull();
    expect(readValidRecoveryMarker('user-1', 'session-A', RECOVERY_MARKER_TTL_MS - 1)).not.toBeNull();
  });

  it('returns null when no marker was ever written', () => {
    expect(readValidRecoveryMarker('user-1', 'session-A', 1000)).toBeNull();
  });

  it('clearRecoveryMarker removes a previously written marker', () => {
    writeRecoveryMarker('user-1', 'session-A', 1000);

    clearRecoveryMarker();

    expect(readValidRecoveryMarker('user-1', 'session-A', 1000)).toBeNull();
  });

  it('returns null without throwing when sessionStorage contains malformed JSON', () => {
    sessionStorage.setItem('patcher.recovery-session-marker.v1', '{not valid json');

    expect(() => readValidRecoveryMarker('user-1', 'session-A', 1000)).not.toThrow();
    expect(readValidRecoveryMarker('user-1', 'session-A', 1000)).toBeNull();
  });
});
