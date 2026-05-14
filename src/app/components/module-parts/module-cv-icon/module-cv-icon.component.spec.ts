import { ModuleCvIconComponent } from './module-cv-icon.component';

describe('ModuleCvIconComponent', () => {
  let comp: ModuleCvIconComponent;

  beforeEach(() => { comp = new ModuleCvIconComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
