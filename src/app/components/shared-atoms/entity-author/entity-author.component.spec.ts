import { EntityAuthorComponent } from './entity-author.component';

describe('EntityAuthorComponent', () => {
  let comp: EntityAuthorComponent;

  beforeEach(() => {
    comp = new EntityAuthorComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
