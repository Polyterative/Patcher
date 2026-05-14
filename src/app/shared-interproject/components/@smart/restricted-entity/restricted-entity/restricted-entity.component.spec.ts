import { RestrictedEntityComponent } from './restricted-entity.component';

describe('RestrictedEntityComponent', () => {
  let comp: RestrictedEntityComponent;

  beforeEach(() => { comp = new RestrictedEntityComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('disabled defaults to false', () => {
    expect(comp.disabled).toBeFalse();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
