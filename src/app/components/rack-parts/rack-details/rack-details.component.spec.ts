import { RackDetailsComponent } from './rack-details.component';
import { RackMinimal } from 'src/app/models/rack';
import { RackDetailDataService } from '../rack-detail-data.service';

describe('RackDetailsComponent', () => {
  let comp: RackDetailsComponent;
  let mockDataService: RackDetailDataService;

  beforeEach(() => {
    mockDataService = {} as RackDetailDataService;
    comp = new RackDetailsComponent(mockDataService);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('exposes dataService', () => {
    expect(comp.dataService).toBe(mockDataService);
  });

  it('data input can be assigned', () => {
    const rack: RackMinimal = {
      id: 3,
      name: 'Skiff',
      hp: 84,
      rows: 2,
      public: true,
      locked: false,
      author: {id: 'user-1', username: 'alice'},
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z'
    };
    comp.data = rack;
    expect(comp.data).toBe(rack);
  });
});
