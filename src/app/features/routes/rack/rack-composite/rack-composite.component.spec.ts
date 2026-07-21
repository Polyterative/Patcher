import { RackCompositeComponent } from './rack-composite.component';
import { Rack } from 'src/app/models/rack';

function rackFactory(id: number, name = `Rack ${ id }`): Rack {
  return {
    id,
    name,
    hp: 104,
    rows: 2,
    author: {id: 'user-1', username: 'patcher'},
    locked: false,
    public: true,
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z'
  };
}

describe('RackCompositeComponent', () => {
  it('creates', () => { expect(new RackCompositeComponent()).toBeTruthy(); });
  it('data input can be assigned', () => {
    const comp = new RackCompositeComponent();
    comp.data = rackFactory(1, 'My Rack');
    expect(comp.data.id).toBe(1);
  });
  it('data name is preserved after assignment', () => {
    const comp = new RackCompositeComponent();
    comp.data = rackFactory(5, 'Studio Rack');
    expect(comp.data.name).toBe('Studio Rack');
  });
});
