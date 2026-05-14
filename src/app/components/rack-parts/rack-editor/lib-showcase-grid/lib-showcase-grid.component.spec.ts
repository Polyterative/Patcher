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

  it('multiple data items are preserved in order', () => {
    comp.data = [{label: 'A', value: '1'}, {label: 'B', value: '2'}];
    expect(comp.data[0].label).toBe('A');
    expect(comp.data[1].value).toBe('2');
  });
});
