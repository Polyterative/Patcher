import { CleanCardComponent } from './clean-card.component';

describe('CleanCardComponent', () => {
  it('creates without error', () => {
    expect(new CleanCardComponent()).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    const comp = new CleanCardComponent();
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
