import { ModuleRealisticHolelineComponent } from './module-realistic-holeline.component';

describe('ModuleRealisticHolelineComponent', () => {
  it('creates without error', () => {
    expect(new ModuleRealisticHolelineComponent()).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    const comp = new ModuleRealisticHolelineComponent();
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('data input can be assigned', () => {
    const comp = new ModuleRealisticHolelineComponent();
    comp.data = {id: 3, hp: 6} as any;
    expect(comp.data.hp).toBe(6);
  });
});
