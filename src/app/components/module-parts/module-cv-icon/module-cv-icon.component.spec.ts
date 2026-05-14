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

  it('type input can be set to in', () => {
    comp.type = 'in';
    expect(comp.type).toBe('in');
  });

  it('type input can be set to out', () => {
    comp.type = 'out';
    expect(comp.type).toBe('out');
  });
});
