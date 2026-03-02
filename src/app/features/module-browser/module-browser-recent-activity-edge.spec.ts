import { ModuleBrowserRecentActivityService } from './module-browser-recent-activity.service';
import { MinimalModule } from 'src/app/models/module';
import { BehaviorSubject } from 'rxjs';


function makeModule(id: number, name: string, created: string, updated: string, manufacturerName = 'Maker'): MinimalModule {
  return {
    id,
    name,
    description: '',
    hp: 8,
    public: true,
    manufacturerId: 1,
    manufacturer: {id: 1, name: manufacturerName},
    standard: {id: 0, name: '3U'},
    tags: [],
    panels: [],
    created,
    updated
  } as MinimalModule;
}


describe('ModuleBrowserRecentActivityService - edge cases', () => {
  let service: ModuleBrowserRecentActivityService;
  
  beforeEach(() => {
    service = new ModuleBrowserRecentActivityService();
  });
  
  it('returns empty array for null input', () => {
    expect(service.mapModulesToRecentActivityItems(null, 5)).toEqual([]);
  });
  
  it('returns empty array for empty module list', () => {
    expect(service.mapModulesToRecentActivityItems([], 5)).toEqual([]);
  });
  
  it('returns empty array when maxItems is 0', () => {
    const modules = [makeModule(1, 'A', '2025-01-01T00:00:00.000Z', '2025-01-02T00:00:00.000Z')];
    expect(service.mapModulesToRecentActivityItems(modules, 0)).toEqual([]);
  });
  
  it('respects maxItems limit', () => {
    const modules = [
      makeModule(1, 'A', '2025-01-01T00:00:00.000Z', '2025-01-05T00:00:00.000Z'),
      makeModule(2, 'B', '2025-01-01T00:00:00.000Z', '2025-01-04T00:00:00.000Z'),
      makeModule(3, 'C', '2025-01-01T00:00:00.000Z', '2025-01-03T00:00:00.000Z'),
      makeModule(4, 'D', '2025-01-01T00:00:00.000Z', '2025-01-02T00:00:00.000Z')
    ];
    expect(service.mapModulesToRecentActivityItems(modules, 2).length).toBe(2);
  });
  
  it('activity id encodes module id and type', () => {
    const modules = [makeModule(42, 'X', '2025-01-01T00:00:00.000Z', '2025-01-10T00:00:00.000Z')];
    const items = service.mapModulesToRecentActivityItems(modules, 5);
    expect(items[0].id).toContain('42');
    expect(items[0].id).toContain('updated');
  });
  
  it('actorLabel falls back to Unknown author when manufacturer name is missing', () => {
    const modules = [makeModule(1, 'X', '2025-01-01T00:00:00.000Z', '2025-01-02T00:00:00.000Z')] as any;
    modules[0].manufacturer = null;
    const items = service.mapModulesToRecentActivityItems(modules, 5);
    expect(items[0].actorLabel).toBe('Unknown author');
  });
  
  it('route contains the module id', () => {
    const modules = [makeModule(7, 'Route Test', '2025-02-01T00:00:00.000Z', '2025-02-01T00:00:00.000Z')];
    const items = service.mapModulesToRecentActivityItems(modules, 5);
    expect(items[0].route).toContain(7);
  });
  
  it('getRecentActivityItems$ emits transformed results from the observable source', (done) => {
    const subject$ = new BehaviorSubject<MinimalModule[] | null>([
      makeModule(1, 'A', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z')
    ]);
    
    service.getRecentActivityItems$(subject$).subscribe(items => {
      expect(items.length).toBe(1);
      expect(items[0].targetLabel).toBe('A');
      done();
    });
  });
});