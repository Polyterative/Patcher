import { FlexboxRowFastComponent } from './flexbox-row-fast.component';

describe('FlexboxRowFastComponent', () => {
  it('creates without error', () => {
    expect(new FlexboxRowFastComponent()).toBeTruthy();
  });


  it('instances are independent', () => {
    expect(new FlexboxRowFastComponent()).not.toBe(new FlexboxRowFastComponent());
  });
});
