import { ModuleRealisticHolelineComponent } from './module-realistic-holeline.component';

describe('ModuleRealisticHolelineComponent', () => {
  it('creates without error', () => {
    expect(new ModuleRealisticHolelineComponent()).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    const comp = new ModuleRealisticHolelineComponent();
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
