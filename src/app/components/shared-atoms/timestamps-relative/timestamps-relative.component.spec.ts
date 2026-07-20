import { TimestampsRelativeComponent } from './timestamps-relative.component';


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

describe('TimestampsRelativeComponent', () => {
  let comp: TimestampsRelativeComponent;

  beforeEach(() => { comp = new TimestampsRelativeComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('data input can be assigned', () => {
    const freshComp = new TimestampsRelativeComponent();
    const timestamps: TimestampsRelativeComponent['data'] = {
      created: '2024-01-01T00:00:00Z',
      updated: '2024-06-01T12:00:00Z'
    };

    setReadonlyInput(freshComp, 'data', timestamps);

    expect(freshComp.data.created).toBe('2024-01-01T00:00:00Z');
  });

  it('data updated field is preserved', () => {
    const freshComp = new TimestampsRelativeComponent();
    const timestamps: TimestampsRelativeComponent['data'] = {
      created: '2024-01-01T00:00:00Z',
      updated: '2025-01-15T08:30:00Z'
    };

    setReadonlyInput(freshComp, 'data', timestamps);

    expect(freshComp.data.updated).toBe('2025-01-15T08:30:00Z');
  });
});
