import { DeviceFrameWrapperComponent } from './device-frame-wrapper.component';

describe('DeviceFrameWrapperComponent', () => {
  it('creates without error', () => {
    expect(new DeviceFrameWrapperComponent()).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    const comp = new DeviceFrameWrapperComponent();
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
