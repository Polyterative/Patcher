import {
  BehaviorSubject,
  ReplaySubject
} from 'rxjs';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { Rack } from 'src/app/models/rack';
import {
  defaultRackMinimalViewConfig,
  RackMinimalComponent
} from './rack-minimal.component';

function mockUserMgmt(): UserManagementService {
  return {} as unknown as UserManagementService;
}

function mockDataService(): Pick<RackDetailDataService, 'singleRackData$' | 'updateSingleRackData$' | 'updateSingleRackByPublicId$'> {
  return {
    singleRackData$: new BehaviorSubject<Rack | undefined>(undefined),
    updateSingleRackData$: new ReplaySubject<number>(1),
    updateSingleRackByPublicId$: new ReplaySubject<string>(1)
  };
}

describe('RackMinimalComponent', () => {
  let comp: RackMinimalComponent;

  beforeEach(() => {
    comp = new RackMinimalComponent(
      mockUserMgmt(),
      mockDataService() as unknown as RackDetailDataService
    );
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
