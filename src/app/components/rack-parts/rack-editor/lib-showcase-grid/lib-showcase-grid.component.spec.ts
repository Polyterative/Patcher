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

  it('data input can be assigned', () => {
    comp.data = [{label: 'Modules', value: '42'}];
    expect(comp.data.length).toBe(1);
    expect(comp.data[0].label).toBe('Modules');
  });
});
