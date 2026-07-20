import { LocalDataFilterService } from '../local-data-filter.service';
import { LocalDataFilterComponent } from './local-data-filter.component';

describe('LocalDataFilterComponent', () => {
  let comp: LocalDataFilterComponent;
  let mockDataService: LocalDataFilterService;

  beforeEach(() => {
    mockDataService = new LocalDataFilterService();
    comp = new LocalDataFilterComponent(mockDataService);
  });

  afterEach(() => mockDataService.ngOnDestroy());

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('exposes dataService', () => {
    expect(comp.dataService).toBe(mockDataService);
  });

});
