import { ModulePartHpComponent } from './module-part-hp.component';

describe('ModulePartHpComponent', () => {
  let comp: ModulePartHpComponent;

  beforeEach(() => {
    comp = new ModulePartHpComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('data input can be assigned', () => {
    comp.data = {id: 5, hp: 14} as any;
    expect(comp.data.hp).toBe(14);
  });
});
