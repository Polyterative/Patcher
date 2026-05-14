import { BrowserResetFiltersButtonComponent } from './browser-reset-filters-button.component';

describe('BrowserResetFiltersButtonComponent', () => {
  let comp: BrowserResetFiltersButtonComponent;

  beforeEach(() => {
    comp = new BrowserResetFiltersButtonComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('reset$ is an EventEmitter', () => {
    expect(comp.reset$).toBeTruthy();
    let emitted = false;
    comp.reset$.subscribe(() => (emitted = true));
    comp.reset$.emit();
    expect(emitted).toBeTrue();
  });

  it('canReset$ input can be assigned', () => {
    const obs = new (require('rxjs').Subject)();
    comp.canReset$ = obs;
    expect(comp.canReset$).toBe(obs);
  });
});
