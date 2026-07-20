import { EntityAuthorComponent } from './entity-author.component';
import { PublicUser } from 'src/app/models/user';


function setReadonlyInput<TComponent, TKey extends keyof TComponent>(
  component: TComponent,
  key: TKey,
  value: TComponent[TKey]
): void {
  Object.defineProperty(component, key, {
    value,
    configurable: true
  });
}

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

  it('data input can be assigned', () => {
    const user: PublicUser = {
      id: 'user-1',
      username: 'alice'
    };

    setReadonlyInput(comp, 'data', user);

    expect(comp.data.username).toBe('alice');
  });
});
