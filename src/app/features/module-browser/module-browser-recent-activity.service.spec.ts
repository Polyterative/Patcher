import { BehaviorSubject } from 'rxjs';
import { ModuleBrowserRecentActivityService } from './module-browser-recent-activity.service';
import { MinimalModule } from 'src/app/models/module';
import { RecentActivityItem } from 'src/app/components/shared-atoms/recent-activity/recent-activity.model';


describe('ModuleBrowserRecentActivityService', () => {
  function build() {
    const service = new ModuleBrowserRecentActivityService();
    return {service};
  }

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
    };
  }
  
  it('maps module list into recent activity sorted by updated timestamp', () => {
    const {service} = build();
    const modules = [
      makeModule(2, 'Older Module', '2025-01-01T00:00:00.000Z', '2025-01-02T00:00:00.000Z', 'Maker A'),
      makeModule(1, 'Newest Module', '2025-01-03T00:00:00.000Z', '2025-01-04T00:00:00.000Z', 'Maker B')
    ];
    
    const result = service.mapModulesToRecentActivityItems(modules, 5);
    
    expect(result.map(item => item.targetLabel)).toEqual(['Newest Module', 'Older Module']);
    expect(result[0].actionLabel).toBe('updated');
    expect(result[0].actorLabel).toBe('Maker B');
    expect(result[0].contextLabel).toBe('Module');
    expect(result[0].route).toEqual(['/modules', 'details', 1]);
  });
  
  it('uses create activity when module created and updated timestamps match', () => {
    const {service} = build();
    const modules = [
      makeModule(7, 'Fresh Module', '2025-03-01T10:00:00.000Z', '2025-03-01T10:00:00.000Z', 'Maker C')
    ];
    
    const result = service.mapModulesToRecentActivityItems(modules, 5);
    
    expect(result[0].type).toBe('create');
    expect(result[0].actionLabel).toBe('created');
    expect(result[0].timestamp).toBe('2025-03-01T10:00:00.000Z');
  });
  
  it('derives activity stream from module stream', () => {
    const {service} = build();
    const modules$ = new BehaviorSubject<MinimalModule[] | null>(null);
    const output: RecentActivityItem[] = [];
    
    service.getRecentActivityItems$(modules$).subscribe(items => {
      output.splice(0, output.length, ...items);
    });
    
    modules$.next([
      makeModule(9, 'Activity Source', '2025-02-01T00:00:00.000Z', '2025-02-02T00:00:00.000Z')
    ]);
    
    expect(output.length).toBe(1);
    expect(output[0].targetLabel).toBe('Activity Source');
  });

  it('returns empty array when modules input is null', () => {
    const {service} = build();
    expect(service.mapModulesToRecentActivityItems(null, 5)).toEqual([]);
  });

  it('returns empty array when maxItems is 0', () => {
    const {service} = build();
    const modules = [
      makeModule(1, 'M', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z', 'X')
    ];
    expect(service.mapModulesToRecentActivityItems(modules, 0)).toEqual([]);
  });

  it('slices to maxItems when more modules are provided', () => {
    const {service} = build();
    const modules = Array.from({length: 10}, (_, i) => ({
      ...makeModule(
        i + 1,
        `Module ${i}`,
        `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
        `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
        'X'
      ),
      hp: 4
    }));
    expect(service.mapModulesToRecentActivityItems(modules, 3).length).toBe(3);
  });
});