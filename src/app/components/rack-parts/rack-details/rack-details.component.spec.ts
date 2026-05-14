import { RackDetailsComponent } from './rack-details.component';

describe('RackDetailsComponent', () => {
  let comp: RackDetailsComponent;
  let mockDataService: any;

  beforeEach(() => {
    mockDataService = {};
    comp = new RackDetailsComponent(mockDataService);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('exposes dataService', () => {
    expect(comp.dataService).toBe(mockDataService);
  });

  it('data input can be assigned', () => {
    const rack = {id: 3, name: 'Skiff'} as any;
    comp.data = rack;
    expect(comp.data).toBe(rack);
  });
});
