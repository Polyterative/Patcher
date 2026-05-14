import { RackDetailsRemainingIndicatorComponent } from './rack-details-remaining-indicator.component';

describe('RackDetailsRemainingIndicatorComponent', () => {
  let comp: RackDetailsRemainingIndicatorComponent;

  beforeEach(() => {
    comp = new RackDetailsRemainingIndicatorComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('data input can be assigned', () => {
    comp.data = {hp: 104} as any;
    expect(comp.data.hp).toBe(104);
  });

  it('rowModules input can be assigned', () => {
    comp.rowModules = [{moduleId: 1} as any];
    expect(comp.rowModules.length).toBe(1);
  });
});
