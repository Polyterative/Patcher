import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import {
  BehaviorSubject,
  of,
} from 'rxjs';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { CommentsDataService } from 'src/app/components/shared-atoms/comments/comments-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { RackBrowserDetailViewComponent } from './rack-browser-detail-view.component';

describe('RackBrowserDetailViewComponent', () => {
  let component: RackBrowserDetailViewComponent;
  let dataService: any;
  let userAreaDataService: any;
  let seoService: any;
  let commentsDataService: any;
  let userManagementService: any;
  let singleRackData$: BehaviorSubject<any>;
  let rowedRackedModules$: BehaviorSubject<any>;

  beforeEach(() => {
    singleRackData$ = new BehaviorSubject<any>(undefined);
    rowedRackedModules$ = new BehaviorSubject<any>(undefined);
    dataService = {
      setPublicDetailMode: jasmine.createSpy('setPublicDetailMode'),
      updateSingleRackData$: {next: jasmine.createSpy('updateSingleRackData$.next')},
      singleRackData$,
      rowedRackedModules$
    };
    userAreaDataService = {
      updateModulesData$: {next: jasmine.createSpy('updateModulesData$.next')}
    };
    seoService = {updateSeo: jasmine.createSpy('updateSeo')};
    commentsDataService = {requestCommentsUpdate$: {next: jasmine.createSpy('requestCommentsUpdate$.next')}};
    userManagementService = {loggedUser$: of(undefined)};

    component = new RackBrowserDetailViewComponent(
      dataService,
      userAreaDataService,
      {params: of({id: '42'})} as any,
      seoService,
      commentsDataService,
      userManagementService
    );
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  function makeRackedModule(
    moduleId: number,
    hp: number,
    powerPos12: number | null,
    powerNeg12: number | null,
    powerPos5: number | null
  ): any {
    return {
      module: {
        id: moduleId,
        hp,
        powerPos12,
        powerNeg12,
        powerPos5,
        depth: 10,
        weight: 100
      }
    };
  }

  it('keeps the power group focused on the three rack rail totals', () => {
    const rows = component.rackSummaryStatRows({hp: 84, rows: 2} as any, [
      [makeRackedModule(101, 8, 50, -20, 0)],
      [makeRackedModule(202, 10, 75, -35, 5)]
    ]);
    const powerGroup = rows[1][0];

    expect(powerGroup.items.map(item => item.label)).toEqual(['+12V', '-12V', '+5V']);
  });

  it('uses public detail reads for signed-out visitors', () => {
    component.ngOnInit();

    expect(dataService.setPublicDetailMode).toHaveBeenCalledWith(true);
    expect(dataService.updateSingleRackData$.next).toHaveBeenCalledWith(42);
  });

  it('shows the wide-shell nav by default for rack detail pages', () => {
    expect(component.showWideShellNav).toBeTrue();
  });

  it('uses authenticated detail reads for signed-in users', () => {
    userManagementService.loggedUser$ = of({id: 'u1'});
    component = new RackBrowserDetailViewComponent(
      dataService,
      userAreaDataService,
      {params: of({id: '77'})} as any,
      seoService,
      commentsDataService,
      userManagementService
    );

    component.ngOnInit();

    expect(dataService.setPublicDetailMode).toHaveBeenCalledWith(false);
    expect(userAreaDataService.updateModulesData$.next).toHaveBeenCalled();
    expect(dataService.updateSingleRackData$.next).toHaveBeenCalledWith(77);
  });

  describe('template comment visibility', () => {
    let fixture: ComponentFixture<RackBrowserDetailViewComponent>;
    let templateDataService: any;
    let templateUserAreaDataService: any;
    let templateCommentsDataService: any;
    let templateUserManagementService: any;
    let singleRackData$: BehaviorSubject<any>;
    let rowedRackedModules$: BehaviorSubject<any>;
    let isCurrentRackEditable$: BehaviorSubject<boolean>;
    let isCurrentRackPropertyOfCurrentUser$: BehaviorSubject<boolean>;

    beforeEach(async () => {
      singleRackData$ = new BehaviorSubject<any>({
        id: 42,
        name: 'Rack',
        hp: 84,
        rows: 2,
      });
      rowedRackedModules$ = new BehaviorSubject<any>([[makeRackedModule(101, 8, 50, -20, 0)]]);
      isCurrentRackEditable$ = new BehaviorSubject<boolean>(false);
      isCurrentRackPropertyOfCurrentUser$ = new BehaviorSubject<boolean>(true);

      templateDataService = {
        setPublicDetailMode: jasmine.createSpy('setPublicDetailMode'),
        updateSingleRackData$: {next: jasmine.createSpy('updateSingleRackData$.next')},
        singleRackData$,
        rowedRackedModules$,
        isCurrentRackEditable$,
        isCurrentRackPropertyOfCurrentUser$,
      };
      templateUserAreaDataService = {
        updateModulesData$: {next: jasmine.createSpy('updateModulesData$.next')},
        modulesData$: of([]),
      };
      templateCommentsDataService = {
        requestCommentsUpdate$: {next: jasmine.createSpy('requestCommentsUpdate$.next')},
      };
      templateUserManagementService = {loggedUser$: of({id: 'u1'})};

      await TestBed.configureTestingModule({
        declarations: [RackBrowserDetailViewComponent],
        imports: [
          CommonModule,
          NoopAnimationsModule,
        ],
        providers: [
          {provide: RackDetailDataService, useValue: templateDataService},
          {provide: UserAreaDataService, useValue: templateUserAreaDataService},
          {provide: SeoAndUtilsService, useValue: {updateSeo: jasmine.createSpy('updateSeo')}},
          {provide: CommentsDataService, useValue: templateCommentsDataService},
          {provide: UserManagementService, useValue: templateUserManagementService},
          {provide: ActivatedRoute, useValue: {params: of({id: '42'})}},
        ],
        schemas: [NO_ERRORS_SCHEMA],
      })
        .overrideComponent(RackBrowserDetailViewComponent, {
          set: {
            providers: [],
          }
        })
        .compileComponents();

      fixture = TestBed.createComponent(RackBrowserDetailViewComponent);
      fixture.componentInstance.ignoreSeo = true;
    });

    it('shows comments while not editing', () => {
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-comments-root')).not.toBeNull();
    });

    it('hides comments while editing', () => {
      isCurrentRackEditable$.next(true);

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-comments-root')).toBeNull();
    });
  });

});
