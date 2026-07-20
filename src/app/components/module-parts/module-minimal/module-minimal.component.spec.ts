import {
  MatDialog,
  MatDialogRef
} from '@angular/material/dialog';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { RackDetailDataService } from '../../rack-parts/rack-detail-data.service';
import {
  DbModule,
  MinimalModule,
  UserModulePossessionKind
} from 'src/app/models/module';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { ModuleDetailDataService } from '../module-detail-data.service';
import { RackMinimal } from 'src/app/models/rack';
import { CV } from 'src/app/models/cv';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalComponent
} from './module-minimal.component';
import {
  ModulePossessionDialogComponent,
  ModulePossessionDialogResult
} from '../module-possession-dialog/module-possession-dialog.component';

type PossessionDialogResult = ModulePossessionDialogResult | null | undefined;
type ModuleDataServiceDouble = jasmine.SpyObj<ModuleDetailDataService> & Pick<ModuleDetailDataService, 'userModulesList$' | 'setModulePossession$'>;

function cvFixture(id: number): CV {
  return {
    id,
    name: `CV ${ id }`
  };
}

function minimalModuleFixture(overrides: Partial<MinimalModule> = {}): MinimalModule {
  return {
    id: 42,
    name: 'Maths',
    description: 'Maths module',
    hp: 20,
    public: true,
    manufacturer: {
      id: 1,
      name: 'Make Noise'
    },
    manufacturerId: 1,
    standard: {
      id: 0,
      name: 'Eurorack'
    },
    tags: [],
    panels: [],
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

function dbModuleFixture(overrides: Partial<DbModule> = {}): DbModule {
  return {
    ...minimalModuleFixture(overrides),
    ins: [],
    outs: [],
    switches: [],
    manualURL: '',
    store_url: null,
    additional: null,
    isComplete: true,
    isApproved: true,
    isDIY: false,
    powerPos12: null,
    powerNeg12: null,
    powerPos5: null,
    depth: 0,
    weight: 0,
    ...overrides
  };
}

function rackMinimalFixture(overrides: Partial<RackMinimal> = {}): RackMinimal {
  return {
    id: 7,
    name: 'Perf Rack',
    hp: 84,
    rows: 1,
    author: {
      id: 'user-1',
      username: 'patcher'
    },
    locked: false,
    public: true,
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

function createModuleDataServiceDouble(
  userModulesList$: BehaviorSubject<DbModule[]>,
  setModulePossession$: Subject<UserModulePossessionKind | ModulePossessionDialogResult | null>
): ModuleDataServiceDouble {
  return jasmine.createSpyObj<ModuleDetailDataService>(
    'ModuleDetailDataService',
    ['ngOnDestroy'],
    {
      userModulesList$,
      setModulePossession$
    }
  ) as ModuleDataServiceDouble;
}

describe('ModuleMinimalComponent', () => {
  function build() {
    const userModulesList$ = new BehaviorSubject<DbModule[]>([]);
    const setModulePossession$ = new Subject<UserModulePossessionKind | ModulePossessionDialogResult | null>();
    const afterClosed$ = new Subject<PossessionDialogResult>();
    const dialogRef = jasmine.createSpyObj<MatDialogRef<ModulePossessionDialogComponent, PossessionDialogResult>>(
      'MatDialogRef',
      ['afterClosed']
    );
    dialogRef.afterClosed.and.returnValue(afterClosed$.asObservable());
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue(dialogRef);
    const component = new ModuleMinimalComponent(
      jasmine.createSpyObj<UserManagementService>('UserManagementService', ['ngOnDestroy']),
      createModuleDataServiceDouble(userModulesList$, setModulePossession$),
      jasmine.createSpyObj<RackDetailDataService>('RackDetailDataService', ['ngOnDestroy']),
      dialog
    );
    component.data = minimalModuleFixture();
    return {component, userModulesList$, setModulePossession$, dialog, afterClosed$};
  }
  
  it('maps owned membership state from userModulesList$', () => {
    const {component, userModulesList$} = build();
    let latest: boolean | undefined;

    component.ngOnInit();
    component.isInCollection$.subscribe(v => latest = v);

    userModulesList$.next([dbModuleFixture({id: 42, possessionKind: 'HAS'})]);
    expect(latest).toBeTrue();

    userModulesList$.next([dbModuleFixture({id: 42, possessionKind: 'SELLS'})]);
    expect(latest).toBeTrue();

    userModulesList$.next([dbModuleFixture({id: 42, possessionKind: 'WANTS'})]);
    expect(latest).toBeFalse();

    userModulesList$.next([dbModuleFixture({id: 1})]);
    expect(latest).toBeFalse();
  });

  it('maps possession kind from userModulesList$', () => {
    const {component, userModulesList$} = build();
    let latest: string | null | undefined;

    component.ngOnInit();
    component.possessionKind$.subscribe(v => latest = v);

    userModulesList$.next([dbModuleFixture({id: 42, possessionKind: 'WANTS'})]);
    expect(latest).toBe('WANTS');

    userModulesList$.next([dbModuleFixture({id: 1})]);
    expect(latest).toBeNull();
  });
  
  it('emits and completes inherited destroy subject on ngOnDestroy', () => {
    const {component} = build();
    const nextSpy = spyOn(component.destroy$, 'next').and.callThrough();
    const completeSpy = spyOn(component.destroy$, 'complete').and.callThrough();
    
    component.ngOnDestroy();
    
    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  it('hides the footer when no module-detail or rack actions are available', () => {
    const {component} = build();

    expect(component.shouldRenderActionFooter(undefined, undefined, false)).toBeFalse();
  });

  it('shows the footer when module-detail actions are available', () => {
    const {component} = build();

    expect(component.shouldRenderActionFooter(minimalModuleFixture({id: 42}), undefined, false)).toBeTrue();
  });

  it('shows the footer when rack actions are available from an editable rack', () => {
    const {component} = build();

    expect(component.shouldRenderActionFooter(undefined, rackMinimalFixture(), true)).toBeTrue();
  });

  it('hides the panel variants badge when the view config disables panel options', () => {
    const {component} = build();
    component.data = minimalModuleFixture({
      panels: [
        {
          id: 1,
          moduleid: 42,
          color: 0,
          filename: 'panel-a.webp',
          description: 'Panel A'
        },
        {
          id: 2,
          moduleid: 42,
          color: 1,
          filename: 'panel-b.webp',
          description: 'Panel B'
        }
      ]
    });
    component.viewConfig = {
      ...defaultModuleMinimalViewConfig,
      hidePanelsOptions: true
    };

    expect(component.shouldShowPanelVariantsBadge()).toBeFalse();
  });

  it('disables description-derived analysis by default for minimal module views', () => {
    expect(defaultModuleMinimalViewConfig.showDescriptionAnalysis).toBeFalse();
    expect(defaultModuleMinimalViewConfig.showFrequencyAnalysis).toBeFalse();
  });

  it('shows the panel variants badge when multiple panels exist and panel options are visible', () => {
    const {component} = build();
    component.data = minimalModuleFixture({
      panels: [
        {
          id: 1,
          moduleid: 42,
          color: 0,
          filename: 'panel-a.webp',
          description: 'Panel A'
        },
        {
          id: 2,
          moduleid: 42,
          color: 1,
          filename: 'panel-b.webp',
          description: 'Panel B'
        }
      ]
    });
    component.viewConfig = {
      ...defaultModuleMinimalViewConfig,
      hidePanelsOptions: false
    };

    expect(component.shouldShowPanelVariantsBadge()).toBeTrue();
  });

  it('insCount and outsCount return CV port totals from data', () => {
    const {component} = build();
    component.data = minimalModuleFixture({
      id: 1,
      ins: [cvFixture(1), cvFixture(2)],
      outs: [cvFixture(3)]
    });
    expect(component.insCount).toBe(2);
    expect(component.outsCount).toBe(1);
    expect(component.hasIO).toBeTrue();
  });

  it('hasIO is false when ins and outs are empty', () => {
    const {component} = build();
    component.data = minimalModuleFixture({
      id: 1,
      ins: [],
      outs: []
    });
    expect(component.hasIO).toBeFalse();
  });

  it('insCount and outsCount return 0 when data is undefined', () => {
    const {component} = build();
    component.data = undefined;
    expect(component.insCount).toBe(0);
    expect(component.outsCount).toBe(0);
  });

  it('shouldShowPanelVariantsBadge is false when only one panel exists', () => {
    const {component} = build();
    component.data = minimalModuleFixture({
      panels: [
        {
          id: 1,
          moduleid: 42,
          color: 0,
          filename: 'panel-a.webp',
          description: 'Panel A'
        }
      ]
    });
    expect(component.shouldShowPanelVariantsBadge()).toBeFalse();
  });

  it('opens the possession dialog from the add action', () => {
    const {component, dialog} = build();

    component.openPossessionDialog();

    expect(dialog.open).toHaveBeenCalledWith(ModulePossessionDialogComponent, jasmine.objectContaining({
      data: {
        module: component.data,
        initialKind: null
      },
      ariaLabel: 'Add module to your collection'
    }));
  });

  it('opens the possession dialog with the current state from the manage action', () => {
    const {component, dialog} = build();

    component.openPossessionDialog('WANTS');

    expect(dialog.open).toHaveBeenCalledWith(ModulePossessionDialogComponent, jasmine.objectContaining({
      data: {
        module: component.data,
        initialKind: 'WANTS'
      },
      ariaLabel: 'Manage module collection status'
    }));
  });

  it('passes dialog changes and removal requests to the data service', () => {
    const {component, setModulePossession$, afterClosed$} = build();
    const nextSpy = spyOn(setModulePossession$, 'next');

    component.openPossessionDialog('WANTS');
    afterClosed$.next({kind: 'HAS'});
    afterClosed$.next(null);
    afterClosed$.next(undefined);

    expect(nextSpy).toHaveBeenCalledWith({kind: 'HAS'});
    expect(nextSpy).toHaveBeenCalledWith(null);
    expect(nextSpy).toHaveBeenCalledTimes(2);
  });

  it('describes the current state and click action in the manage tooltip', () => {
    const {component} = build();

    expect(component.getPossessionActionTooltip('WANTS'))
      .toBe('Current status: Wanted. Click to change or remove this module from your collection.');
    expect(component.getPossessionActionTooltip(null)).toBe('Add module to your collection');
    expect(component.getPossessionActionIcon('WANTS')).toBe('edit_note');
    expect(component.getPossessionActionIcon(null)).toBe('add');
  });

  it('exposes recent market price label and tooltip for the title badge', () => {
    const {component} = build();
    component.priceSummary = {
      moduleId: 42,
      estimatedPriceEurMinor: 39900,
      displayPrice: '~€399',
      storeCount: 4,
      latestObservedAt: '2026-07-01T00:00:00.000Z',
      tooltip: 'Recent market price: ~€399 from 4 stores, latest check Jul 1, 2026.'
    };

    expect(component.priceSummaryLabel).toBe('~€399');
    expect(component.priceBadgeLabel).toBe('~€399');
    expect(component.priceSummaryTooltip).toBe('Recent market price: ~€399 from 4 stores, latest check Jul 1, 2026.');
  });

  it('appends sparse price history to the title badge label and tooltip', () => {
    const {component} = build();
    component.priceSummary = {
      moduleId: 42,
      estimatedPriceEurMinor: 39900,
      displayPrice: '~€399',
      storeCount: 4,
      latestObservedAt: '2026-07-01T00:00:00.000Z',
      tooltip: 'Estimated recent market price.'
    };
    component.priceHistorySummary = {
      moduleId: 42,
      eligiblePointCount: 3,
      storeCount: 2,
      earliestObservedAt: '2026-05-15T00:00:00.000Z',
      latestObservedAt: '2026-07-01T00:00:00.000Z',
      earliestPriceEurMinor: 42000,
      latestPriceEurMinor: 39900,
      minPriceEurMinor: 39900,
      maxPriceEurMinor: 46000,
      trendPercent: -5,
      trendDirection: 'down',
      label: '↓5% 60d',
      rangeLabel: '~€399–€460',
      tooltip: '60-day Price Hub history.'
    };

    expect(component.priceBadgeLabel).toBe('~€399 · ↓5% 60d');
    expect(component.priceSummaryTooltip).toBe('Estimated recent market price. 60-day Price Hub history.');
  });
});
