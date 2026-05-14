import {
  defaultRackMinimalViewConfig,
  RackMinimalComponent,
  RackMinimalViewConfig
} from './rack-minimal.component';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { RackMinimal } from 'src/app/models/rack';
import { BehaviorSubject } from 'rxjs';

function mockUserMgmt(): UserManagementService {
  return {} as unknown as UserManagementService;
}

function mockDataService(): RackDetailDataService {
  return {
    singleRackData$: new BehaviorSubject(undefined)
  } as unknown as RackDetailDataService;
}

function makeRackMinimal(): RackMinimal {
  return {
    id: 1,
    name: 'My Rack',
    hp: 84,
    rows: 3,
    locked: false,
    public: true,
    created: '2024-01-01',
    updated: '2024-01-01',
    author: { id: 'u1', username: 'tester', avatar_url: null }
  } as unknown as RackMinimal;
}

describe('RackMinimalComponent', () => {
  let comp: RackMinimalComponent;

  beforeEach(() => {
    comp = new RackMinimalComponent(mockUserMgmt(), mockDataService());
  });

  describe('construction', () => {
    it('creates without error', () => {
      expect(comp).toBeTruthy();
    });

    it('viewConfig defaults to containImage=false (component override)', () => {
      expect(comp.viewConfig.containImage).toBeFalse();
    });

    it('viewConfig default hideLabels is false', () => {
      expect(comp.viewConfig.hideLabels).toBeFalse();
    });
  });

  describe('ngOnInit', () => {
    it('does not throw', () => {
      comp.data = makeRackMinimal();
      expect(() => comp.ngOnInit()).not.toThrow();
    });
  });

  describe('ngOnDestroy', () => {
    it('does not throw', () => {
      expect(() => comp.ngOnDestroy()).not.toThrow();
    });

    it('completes destroyEvent$ stream', () => {
      let completed = false;
      comp['destroyEvent$'].subscribe({ complete: () => completed = true });
      comp.ngOnDestroy();
      expect(completed).toBeTrue();
    });
  });
});

describe('defaultRackMinimalViewConfig', () => {
  it('has all hide flags false', () => {
    expect(defaultRackMinimalViewConfig.hideLabels).toBeFalse();
    expect(defaultRackMinimalViewConfig.hideDescription).toBeFalse();
    expect(defaultRackMinimalViewConfig.hideButtons).toBeFalse();
    expect(defaultRackMinimalViewConfig.hideHP).toBeFalse();
    expect(defaultRackMinimalViewConfig.hideDates).toBeFalse();
  });

  it('containImage defaults true', () => {
    expect(defaultRackMinimalViewConfig.containImage).toBeTrue();
  });
});
