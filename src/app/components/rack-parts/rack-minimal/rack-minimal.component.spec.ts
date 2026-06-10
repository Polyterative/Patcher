import { BehaviorSubject } from 'rxjs';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  defaultRackMinimalViewConfig,
  RackMinimalComponent
} from './rack-minimal.component';

function mockUserMgmt(): UserManagementService {
  return {} as unknown as UserManagementService;
}

function mockDataService(): RackDetailDataService {
  return {
    singleRackData$: new BehaviorSubject(undefined),
    updateSingleRackData$: {next: jasmine.createSpy('next')} as any,
    updateSingleRackByPublicId$: {next: jasmine.createSpy('next')} as any
  } as unknown as RackDetailDataService;
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
