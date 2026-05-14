import { FlexboxRowFastComponent } from './flexbox-row-fast.component';

describe('FlexboxRowFastComponent', () => {
  it('creates without error', () => {
    expect(new FlexboxRowFastComponent()).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    const comp = new FlexboxRowFastComponent();
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
