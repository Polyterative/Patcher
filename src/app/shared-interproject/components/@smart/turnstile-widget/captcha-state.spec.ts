import { CaptchaState } from './captcha-state';


describe('CaptchaState', () => {
  it('is always ready and sends no token when disabled', () => {
    const state = new CaptchaState('');
    state.token$.next('ignored');

    expect(state.enabled).toBeFalse();
    expect(state.ready).toBeTrue();
    expect(state.tokenForRequest).toBeUndefined();
  });

  it('waits for a token when enabled', () => {
    const state = new CaptchaState('site-key');

    expect(state.ready).toBeFalse();
    expect(state.tokenForRequest).toBeUndefined();

    state.token$.next('token');

    expect(state.ready).toBeTrue();
    expect(state.tokenForRequest).toBe('token');
  });
});
