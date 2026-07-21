import { RackMicroComponent } from './rack-micro.component';
import { RackMinimalViewConfig } from '../rack-parts/rack-minimal/rack-minimal.component';
import { RackMinimal } from '../../models/rack';

describe('RackMicroComponent', () => {
  let comp: RackMicroComponent;
  let rack: RackMinimal;
  let viewConfig: RackMinimalViewConfig;

  beforeEach(() => {
    comp = new RackMicroComponent();
    rack = {
      id: 5,
      name: 'Test Rack',
      hp: 84,
      rows: 3,
      author: {
        id: 'user-1',
        username: 'test-user'
      },
      locked: false,
      public: true,
      created: '2026-07-21T00:00:00.000Z',
      updated: '2026-07-21T00:00:00.000Z'
    };
    viewConfig = {
      hideLabels: true,
      hideDescription: false,
      hideButtons: false,
      hideHP: false,
      hideDates: false,
      containImage: true
    };
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('data input can be assigned', () => {
    comp.data = rack;
    expect(comp.data.id).toBe(5);
  });

  it('viewConfig input can be assigned', () => {
    comp.viewConfig = viewConfig;
    expect(comp.viewConfig.hideLabels).toBeTrue();
  });
});
