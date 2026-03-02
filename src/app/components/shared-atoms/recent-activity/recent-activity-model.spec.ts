import {
  RecentActivityItem,
  RecentActivityType
} from './recent-activity.model';


describe('RecentActivityItem model shapes', () => {
  it('create type is a valid RecentActivityType literal', () => {
    const type: RecentActivityType = 'create';
    expect(['comment', 'update', 'create', 'listing', 'price', 'generic']).toContain(type);
  });
  
  it('a fully populated item satisfies the interface shape', () => {
    const item: RecentActivityItem = {
      id: 'module-1-updated',
      type: 'update',
      actionLabel: 'updated',
      targetLabel: 'Rings',
      timestamp: '2025-03-01T10:00:00.000Z',
      actorLabel: 'Mutable Instruments',
      contextLabel: 'Module',
      route: ['/modules', 'details', 1],
      icon: 'update'
    };
    
    expect(item.id).toBe('module-1-updated');
    expect(item.type).toBe('update');
    expect(item.route).toEqual(['/modules', 'details', 1]);
  });
  
  it('optional fields can be omitted', () => {
    const item: RecentActivityItem = {
      id: 'generic-1',
      type: 'generic',
      actionLabel: 'did something',
      targetLabel: 'Target',
      timestamp: '2025-01-01T00:00:00.000Z'
    };
    
    expect(item.actorLabel).toBeUndefined();
    expect(item.contextLabel).toBeUndefined();
    expect(item.route).toBeUndefined();
    expect(item.icon).toBeUndefined();
  });
  
  it('route can be a plain string', () => {
    const item: RecentActivityItem = {
      id: 'x',
      type: 'listing',
      actionLabel: 'listed',
      targetLabel: 'Thing',
      timestamp: '2025-01-01T00:00:00.000Z',
      route: '/some/path'
    };
    expect(typeof item.route).toBe('string');
  });
  
  it('all RecentActivityType values are valid strings', () => {
    const types: RecentActivityType[] = ['comment', 'update', 'create', 'listing', 'price', 'generic'];
    for (const type of types) {
      expect(typeof type).toBe('string');
    }
  });
});