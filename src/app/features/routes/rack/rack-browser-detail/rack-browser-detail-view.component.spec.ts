import { of } from 'rxjs';
import { RackBrowserDetailViewComponent } from './rack-browser-detail-view.component';

describe('RackBrowserDetailViewComponent', () => {
  let component: RackBrowserDetailViewComponent;
  let dataService: any;
  let seoService: any;
  let commentsDataService: any;
  let userManagementService: any;

  beforeEach(() => {
    dataService = {
      setPublicDetailMode: jasmine.createSpy('setPublicDetailMode'),
      updateSingleRackData$: {next: jasmine.createSpy('updateSingleRackData$.next')},
      singleRackData$: of(undefined),
      rowedRackedModules$: of(undefined)
    };
    seoService = {updateSeo: jasmine.createSpy('updateSeo')};
    commentsDataService = {requestCommentsUpdate$: {next: jasmine.createSpy('requestCommentsUpdate$.next')}};
    userManagementService = {loggedUser$: of(undefined)};

    component = new RackBrowserDetailViewComponent(
      dataService,
      {params: of({id: '42'})} as any,
      seoService,
      commentsDataService,
      userManagementService
    );
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

  it('uses authenticated detail reads for signed-in users', () => {
    userManagementService.loggedUser$ = of({id: 'u1'});
    component = new RackBrowserDetailViewComponent(
      dataService,
      {params: of({id: '77'})} as any,
      seoService,
      commentsDataService,
      userManagementService
    );

    component.ngOnInit();

    expect(dataService.setPublicDetailMode).toHaveBeenCalledWith(false);
    expect(dataService.updateSingleRackData$.next).toHaveBeenCalledWith(77);
  });

});
