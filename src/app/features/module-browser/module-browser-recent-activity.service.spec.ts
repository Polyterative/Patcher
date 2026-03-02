import { BehaviorSubject } from 'rxjs';
import { ModuleBrowserRecentActivityService } from './module-browser-recent-activity.service';


describe('ModuleBrowserRecentActivityService', () => {
  function build() {
    const service = new ModuleBrowserRecentActivityService();
    return {service};
  }
  
  it('maps module list into recent activity sorted by updated timestamp', () => {
    const {service} = build();
    const modules = [
      {
        id: 2,
        name: 'Older Module',
        description: '',
        hp: 8,
        public: true,
        manufacturerId: 10,
        manufacturer: {name: 'Maker A'},
        standard: 0,
        tags: [],
        panels: [],
        created: '2025-01-01T00:00:00.000Z',
        updated: '2025-01-02T00:00:00.000Z'
      },
      {
        id: 1,
        name: 'Newest Module',
        description: '',
        hp: 10,
        public: true,
        manufacturerId: 11,
        manufacturer: {name: 'Maker B'},
        standard: 0,
        tags: [],
        panels: [],
        created: '2025-01-03T00:00:00.000Z',
        updated: '2025-01-04T00:00:00.000Z'
      }
    ] as any;
    
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
      {
        id: 7,
        name: 'Fresh Module',
        description: '',
        hp: 6,
        public: true,
        manufacturerId: 22,
        manufacturer: {name: 'Maker C'},
        standard: 0,
        tags: [],
        panels: [],
        created: '2025-03-01T10:00:00.000Z',
        updated: '2025-03-01T10:00:00.000Z'
      }
    ] as any;
    
    const result = service.mapModulesToRecentActivityItems(modules, 5);
    
    expect(result[0].type).toBe('create');
    expect(result[0].actionLabel).toBe('created');
    expect(result[0].timestamp).toBe('2025-03-01T10:00:00.000Z');
  });
  
  it('derives activity stream from module stream', () => {
    const {service} = build();
    const modules$ = new BehaviorSubject<any>(null);
    const output: any[] = [];
    
    service.getRecentActivityItems$(modules$).subscribe(items => {
      output.splice(0, output.length, ...items);
    });
    
    modules$.next([
      {
        id: 9,
        name: 'Activity Source',
        description: '',
        hp: 6,
        public: true,
        manufacturerId: 1,
        manufacturer: {name: 'Maker'},
        standard: 0,
        tags: [],
        panels: [],
        created: '2025-02-01T00:00:00.000Z',
        updated: '2025-02-02T00:00:00.000Z'
      }
    ]);
    
    expect(output.length).toBe(1);
    expect(output[0].targetLabel).toBe('Activity Source');
  });
});