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
});
