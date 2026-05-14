import { LibShowcaseGridComponent } from './lib-showcase-grid.component';

describe('LibShowcaseGridComponent', () => {
  let comp: LibShowcaseGridComponent;

  beforeEach(() => { comp = new LibShowcaseGridComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('data defaults to empty array', () => {
    expect(comp.data).toEqual([]);
  });
});
