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

  it('data input can be assigned via cast', () => {
    (comp as any)['data'] = {username: 'alice'};
    expect((comp as any)['data'].username).toBe('alice');
  });
});
