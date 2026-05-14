import { UserAvatarComponent } from './user-avatar.component';

describe('UserAvatarComponent', () => {
  let comp: UserAvatarComponent;

  beforeEach(() => {
    comp = new UserAvatarComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('name defaults to empty string', () => {
    expect(comp.name).toBe('');
  });

  it('hideLogoff defaults to false', () => {
    expect(comp.hideLogoff).toBeFalse();
  });

  it('backgroundImagePath defaults to ./default.svg', () => {
    expect(comp.backgroundImagePath).toBe('./default.svg');
  });

  it('logoff$ is an EventEmitter', () => {
    expect(comp.logoff$).toBeDefined();
  });

  it('login$ is an EventEmitter', () => {
    expect(comp.login$).toBeDefined();
  });

  it('signup$ is an EventEmitter', () => {
    expect(comp.signup$).toBeDefined();
  });

  it('emits logoff$ when next called', () => {
    let emitted = false;
    comp.logoff$.subscribe(() => emitted = true);
    comp.logoff$.next();
    expect(emitted).toBeTrue();
  });
});
