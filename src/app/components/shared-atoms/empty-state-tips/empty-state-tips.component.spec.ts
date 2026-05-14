import {
  EmptyStateTipsComponent,
  EmptyStateTip
} from './empty-state-tips.component';

describe('EmptyStateTipsComponent', () => {
  let comp: EmptyStateTipsComponent;

  beforeEach(() => {
    comp = new EmptyStateTipsComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('icon defaults to "info"', () => {
    expect(comp.icon).toBe('info');
  });

  it('title defaults to empty string', () => {
    expect(comp.title).toBe('');
  });

  it('copy defaults to empty string', () => {
    expect(comp.copy).toBe('');
  });

  it('tips defaults to empty array', () => {
    expect(comp.tips).toEqual([]);
  });

  it('compact defaults to false', () => {
    expect(comp.compact).toBeFalse();
  });

  it('accepts tips input', () => {
    const tips: EmptyStateTip[] = [{ icon: 'star', html: '<strong>tip</strong>' }];
    comp.tips = tips;
    expect(comp.tips).toBe(tips);
  });
});
