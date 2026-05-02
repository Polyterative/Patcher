import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  BehaviorSubject,
  Subject,
} from 'rxjs';
import { RackDetailDataService } from '../../rack-detail-data.service';
import { RackPowerHeatmapVisual } from '../../rack-power-heatmap.utils';
import { MapToModulePipe } from '../../map-to-module.pipe';
import { HasUnrackedModulesPipe } from './has-unracked-modules.pipe';
import { RackVisualModelComponent } from './rack-visual-model.component';


describe('RackVisualModelComponent', () => {
  let fixture: ComponentFixture<RackVisualModelComponent>;
  let component: RackVisualModelComponent;
  let moduleRef: any;
  let rackDetailDataService: {
    shouldShowPanelImages$: Subject<boolean>;
    showPowerAnalysisMode$: BehaviorSubject<boolean>;
    currentDownloadElementRef$: {next: jasmine.Spy};
  };

  beforeEach(async () => {
    rackDetailDataService = {
      shouldShowPanelImages$: new Subject<boolean>(),
      showPowerAnalysisMode$: new BehaviorSubject<boolean>(false),
      currentDownloadElementRef$: {next: jasmine.createSpy('next')},
    };

    await TestBed.configureTestingModule({
      declarations: [
        RackVisualModelComponent,
        MapToModulePipe,
        HasUnrackedModulesPipe,
      ],
      imports: [
        CommonModule,
        NoopAnimationsModule,
      ],
      providers: [
        {
          provide: RackDetailDataService,
          useValue: rackDetailDataService,
        }
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(RackVisualModelComponent);
    component = fixture.componentInstance;
    moduleRef = {
      module: {
        hp: 14,
        panels: [],
        powerPos12: null,
        powerNeg12: null,
        powerPos5: null,
      },
      rackingData: {
        selectedPanelId: null,
      }
    } as any;
    component.rackData = {hp: 104} as any;
    component.rowedRackedModules = [[moduleRef]];
    component.isCurrentRackEditable = true;
    component.isCurrentRackPropertyOfCurrentUser = true;
    component.rackDetailDataService = rackDetailDataService as any;
    component.moduleRightClick$ = new Subject<any>();
  });

  it('shows the per-module HP badge in edit mode', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const badge = host.querySelector('.hpIndicator');

    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('14HP');
  });

  it('keeps rack rows using the shared horizontal row layout class', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const rackRow = host.querySelector('.rackRow');
    const rackRowShell = host.querySelector('.rackRowShell');

    expect(rackRow?.classList.contains('row')).toBeTrue();
    expect(rackRow?.classList.contains('rackRow')).toBeTrue();
    expect(rackRowShell).not.toBeNull();
  });

  it('renders module hover stats and reveals them on hover', () => {
    fixture.detectChanges();

    component.setHoveredModule(moduleRef);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const hoverStats = host.querySelector('.moduleHoverStats');
    expect(hoverStats).not.toBeNull();
    expect(component.isHoveredModule(moduleRef)).toBeTrue();
    expect(hoverStats?.textContent?.replace(/\s+/g, '').trim()).toContain('HP14HP');
    expect(hoverStats?.textContent?.replace(/\s+/g, '').trim()).toContain('PWRn/a');
  });

  it('hides the per-module HP badge outside edit mode', () => {
    component.isCurrentRackEditable = false;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.hpIndicator')).toBeNull();
    expect(host.querySelector('.moduleHoverStats')).not.toBeNull();
  });

  it('shows the custom row power panel for hovered rows with modules in power analysis mode', () => {
    moduleRef.module.powerPos12 = 120;
    moduleRef.module.powerNeg12 = -45;
    moduleRef.module.powerPos5 = 10;
    fixture.detectChanges();

    component.setHoveredRow(0);

    expect(component.isRowPowerPanelVisible(0)).toBeTrue();
    expect(component.shouldShowRowPowerPanel(0, true)).toBeTrue();
    expect(component.rowPowerBreakdownAt(0)).toEqual(jasmine.objectContaining({
      rowIndex: 0,
      moduleCount: 1,
      powerPos12: 120,
      powerNeg12: -45,
      powerPos5: 10
    }));
  });

  it('hides the row power panel outside power analysis mode', () => {
    moduleRef.module.powerPos12 = 120;
    moduleRef.module.powerNeg12 = -45;
    moduleRef.module.powerPos5 = 10;
    fixture.detectChanges();

    component.setHoveredRow(0);

    expect(component.isRowPowerPanelVisible(0)).toBeTrue();
    expect(component.shouldShowRowPowerPanel(0, false)).toBeFalse();
  });

  it('places the row power panel below when there is not enough visible space above', () => {
    component.rackViewportElement = {
      getBoundingClientRect: () => ({
        top: 100,
        bottom: 300
      })
    } as any;

    component.setHoveredRow(0, {
      getBoundingClientRect: () => ({
        top: 120,
        bottom: 160
      })
    } as any);

    expect(component.isRowPowerPanelBelow(0)).toBeTrue();
  });

  it('describes missing row power data in the custom row panel footer', () => {
    fixture.detectChanges();

    component.setHoveredRow(0);
    fixture.detectChanges();

    expect(component.rowPowerMissingLabel(0)).toContain('1 module missing power data');
  });

  it('builds module heatmap visuals for powered modules', () => {
    moduleRef.module.powerPos12 = 120;
    moduleRef.module.powerNeg12 = -45;
    moduleRef.module.powerPos5 = 10;
    fixture.detectChanges();

    const visual = component.powerAnalysisVisual(moduleRef) as RackPowerHeatmapVisual;
    expect(visual.className).toBe('powerAnalysisModule--peak');
    expect(visual.totalLabel).toBe('175mA total');
    expect(visual.railsLabel).toBe('+12 120 mA · -12 45 mA · +5 10 mA');
  });

  it('rescales hovered row heatmaps against the hovered row maximum', () => {
    const row0Hot = {
      module: {
        id: 11,
        hp: 14,
        panels: [],
        powerPos12: 120,
        powerNeg12: -45,
        powerPos5: 10,
      },
      rackingData: {
        id: 1,
        row: 0,
        column: 0,
        selectedPanelId: null,
      }
    } as any;
    const row1Warm = {
      module: {
        id: 22,
        hp: 10,
        panels: [],
        powerPos12: 60,
        powerNeg12: -15,
        powerPos5: 0,
      },
      rackingData: {
        id: 2,
        row: 1,
        column: 0,
        selectedPanelId: null,
      }
    } as any;
    const row1Cool = {
      module: {
        id: 33,
        hp: 8,
        panels: [],
        powerPos12: 24,
        powerNeg12: -6,
        powerPos5: 0,
      },
      rackingData: {
        id: 3,
        row: 1,
        column: 1,
        selectedPanelId: null,
      }
    } as any;

    component.rowedRackedModules = [[row0Hot], [row1Warm, row1Cool]];
    fixture.detectChanges();

    expect(component.powerAnalysisVisual(row1Warm).className).toBe('powerAnalysisModule--smoke');

    component.setHoveredRow(1);

    expect(component.powerAnalysisVisual(row1Warm).className).toBe('powerAnalysisModule--peak');
    expect(component.powerAnalysisVisual(row1Cool).className).toBe('powerAnalysisModule--smoke');
    expect(component.powerAnalysisVisual(row0Hot).className).toBe('powerAnalysisModule--inactive');

    component.clearHoveredRow(1);

    expect(component.powerAnalysisVisual(row1Warm).className).toBe('powerAnalysisModule--smoke');
  });

  it('marks modules with missing power data in heatmap mode', () => {
    fixture.detectChanges();

    const visual = component.powerAnalysisVisual(moduleRef) as RackPowerHeatmapVisual;
    expect(visual.className).toBe('powerAnalysisModule--missing');
    expect(visual.totalLabel).toBe('n/a');
  });
});
