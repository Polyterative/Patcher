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
});
