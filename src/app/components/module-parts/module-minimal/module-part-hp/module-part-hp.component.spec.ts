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

  it('data hp of 4 is preserved', () => {
    comp.data = {id: 7, hp: 4} as any;
    expect(comp.data.hp).toBe(4);
  });
});
