import { LocalDataFilterComponent } from './local-data-filter.component';

describe('LocalDataFilterComponent', () => {
  let comp: LocalDataFilterComponent;
  let mockDataService: any;

  beforeEach(() => {
    mockDataService = {};
    comp = new LocalDataFilterComponent(mockDataService);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('exposes dataService', () => {
    expect(comp.dataService).toBe(mockDataService);
  });

});
