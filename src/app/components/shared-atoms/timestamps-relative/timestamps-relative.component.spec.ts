import { TimestampsRelativeComponent } from './timestamps-relative.component';

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
    (freshComp as any)['data'] = {created: '2024-01-01T00:00:00Z', updated: '2024-06-01T12:00:00Z'};
    expect((freshComp as any).data.created).toBe('2024-01-01T00:00:00Z');
  });
});
