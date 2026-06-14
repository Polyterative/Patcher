import { CommonModule } from '@angular/common';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import {
  ElementRef,
  NO_ERRORS_SCHEMA,
  SimpleChange
} from '@angular/core';
import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatMenuModule } from '@angular/material/menu';
import {
  BehaviorSubject,
  Subject,
} from 'rxjs';
import { RackDetailDataService } from '../../rack-detail-data.service';
import { RackPowerHeatmapVisual } from '../../rack-power-heatmap.utils';
import { MapToModulePipe } from '../../map-to-module.pipe';
import { RACK_ANALYSIS_MODES, RackAnalysisMode } from '../../rack-analysis-mode';
import { HasUnrackedModulesPipe } from './has-unracked-modules.pipe';
import { RackVisualModelComponent } from './rack-visual-model.component';
import { TagType } from 'src/app/models/tag';


describe('RackVisualModelComponent', () => {
  let fixture: ComponentFixture<RackVisualModelComponent>;
  let component: RackVisualModelComponent;
  let moduleRef: any;
  let rackDetailDataService: {
    shouldShowPanelImages$: Subject<boolean>;
    analysisMode$: BehaviorSubject<RackAnalysisMode>;
    signalFocusArea$: BehaviorSubject<any>;
    currentDownloadElementRef$: {next: jasmine.Spy};
    rackOrderChange$: {next: jasmine.Spy};
    addBlankToRow$: Subject<{rowId: number; hp: number}>;
  };

  beforeEach(async () => {
    rackDetailDataService = {
      shouldShowPanelImages$: new Subject<boolean>(),
      analysisMode$: new BehaviorSubject<RackAnalysisMode>(RACK_ANALYSIS_MODES.off),
      signalFocusArea$: new BehaviorSubject(null),
      currentDownloadElementRef$: {next: jasmine.createSpy('next')},
      rackOrderChange$: {next: jasmine.createSpy('next')},
      addBlankToRow$: new Subject<{rowId: number; hp: number}>(),
    };

    await TestBed.configureTestingModule({
      declarations: [
        RackVisualModelComponent,
        MapToModulePipe,
        HasUnrackedModulesPipe,
      ],
      imports: [
        CommonModule,
        MatMenuModule,
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
    moduleRef = makeRackedModule(10, 0, 0);
    component.rackData = {hp: 104} as any;
    component.rowedRackedModules = [[moduleRef]];
    component.isCurrentRackEditable = true;
    component.isCurrentRackPropertyOfCurrentUser = true;
    component.rackDetailDataService = rackDetailDataService as any;
    component.moduleRightClick$ = new Subject<any>();
  });

  function makeRackedModule(
    id: number,
    row: number,
    column: number,
    powerPos12: number | null = null,
    powerNeg12: number | null = null,
    powerPos5: number | null = null,
    standardId = 0
  ): any {
    return {
      module: {
        id,
        name: `Module ${ id }`,
        hp: 14,
        panels: [],
        ins: [],
        outs: [],
        tags: [],
        powerPos12,
        powerNeg12,
        powerPos5,
        standard: {id: standardId},
      },
      rackingData: {
        id,
        row,
        column,
        selectedPanelId: null,
      }
    } as any;
  }

  it('shows the per-module HP badge in edit mode', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const badge = host.querySelector('.hpIndicator');

    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('14HP');
  });

  it('tracks persisted rack modules by racking id instead of object identity or coordinates', () => {
    const cloneOfSameRackModule = makeRackedModule(10, 1, 3);

    expect(component.rackModuleTrackKey(moduleRef)).toBe(10);
    expect(component.rackModuleTrackKey(cloneOfSameRackModule)).toBe(10);
  });

  it('keeps an optimistic rack module track key stable after a persisted id is assigned', () => {
    const optimisticModule = makeRackedModule(undefined as any, 0, 1);

    const optimisticKey = component.rackModuleTrackKey(optimisticModule);
    optimisticModule.rackingData.id = 44;

    expect(component.rackModuleTrackKey(optimisticModule)).toBe(optimisticKey);
  });

  it('renders a stable movement key separately from the coordinate key', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const moduleElement = host.querySelector('[data-rack-module-track-key="10"]');

    expect(moduleElement).not.toBeNull();
    expect(moduleElement?.getAttribute('data-rack-module-key')).toBe('10-10-0-0');
  });

  it('hides the per-module HP badge during rack image capture', () => {
    component.suppressHpIndicators = true;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.hpIndicator')).toBeNull();
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

  it('keeps blank rack rows pinned to the full rack template width', () => {
    component.rowedRackedModules = [[]];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const screen = host.querySelector('#screen') as HTMLElement | null;
    const rackRow = host.querySelector('.rackRow') as HTMLElement | null;

    expect(screen?.style.width).toBe('104rem');
    expect(screen?.style.minWidth).toBe('104rem');
    expect(screen?.style.maxWidth).toBe('104rem');
    expect(rackRow?.classList.contains('row-bg')).toBeTrue();
  });

  it('keeps populated rows on the full rack template background', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const rackRow = host.querySelector('.rackRow') as HTMLElement | null;

    expect(rackRow?.classList.contains('row-bg')).toBeTrue();
  });

  it('shows the quick-add blank panel strip only for a hovered editable row', () => {
    fixture.detectChanges();

    let host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.blankStrip')).toBeNull();

    host.querySelector<HTMLElement>('.rackRowShell')?.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    host = fixture.nativeElement as HTMLElement;
    const quickButtons = Array.from(host.querySelectorAll<HTMLButtonElement>('.blankStrip__btn'))
      .map(button => button.textContent?.trim());

    expect(host.querySelector('.blankStrip')).not.toBeNull();
    expect(quickButtons).toEqual(['1', '2', '3', '4', '6', '8', 'more_horiz']);
  });

  it('emits the selected common blank HP for the hovered row', () => {
    const addBlankSpy = spyOn(rackDetailDataService.addBlankToRow$, 'next');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLElement>('.rackRowShell')?.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    const twoHpButton = Array.from(host.querySelectorAll<HTMLButtonElement>('.blankStrip__btn'))
      .find(button => button.textContent?.trim() === '2');

    twoHpButton?.click();

    expect(addBlankSpy).toHaveBeenCalledWith({rowId: 0, hp: 2});
  });

  it('renders full 1-20 HP blank sizes behind the overflow affordance', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLElement>('.rackRowShell')?.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    const trigger = host.querySelector<HTMLButtonElement>('.blankStrip__btn--more');
    trigger?.click();
    fixture.detectChanges();

    const menuButtons = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.blankSizeMenu__btn'))
      .map(button => button.textContent?.trim());

    expect(menuButtons).toEqual(Array.from({length: 20}, (_, index) => `${ index + 1 }`));
  });

  it('keeps the rack template capped to the configured HP width when rows overflow', () => {
    component.rackData = {hp: 100} as any;
    component.rowedRackedModules = [[
      makeRackedModule(10, 0, 0),
      makeRackedModule(11, 0, 14),
      makeRackedModule(12, 0, 28),
      makeRackedModule(13, 0, 42),
      makeRackedModule(14, 0, 56),
      makeRackedModule(15, 0, 70),
      makeRackedModule(16, 0, 84),
      makeRackedModule(17, 0, 98),
    ]];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const screen = host.querySelector('#screen') as HTMLElement | null;
    const rackRowShell = host.querySelector('.rackRowShell') as HTMLElement | null;
    const rackRow = host.querySelector('.rackRow') as HTMLElement | null;

    expect(screen?.style.width).toBe('100rem');
    expect(screen?.style.maxWidth).toBe('100rem');
    expect(rackRowShell).not.toBeNull();
    expect(rackRow?.classList.contains('row-bg')).toBeTrue();
  });

  it('computes zero HP overflow when modules fit within rack capacity', () => {
    component.rackData = {hp: 30} as any;
    component.rowedRackedModules = [[makeRackedModule(1, 0, 0), makeRackedModule(2, 0, 14)]]; // 14+14=28 < 30
    fixture.detectChanges();

    expect(component.rowHpOverflowAt(0)).toBe(0);
    expect(component.totalHpOverflow).toBe(0);
  });

  it('computes positive HP overflow when modules exceed rack capacity', () => {
    component.rackData = {hp: 20} as any;
    component.rowedRackedModules = [[makeRackedModule(1, 0, 0), makeRackedModule(2, 0, 14)]]; // 14+14=28 > 20 → overflow=8
    fixture.detectChanges();

    expect(component.rowHpOverflowAt(0)).toBe(8);
    expect(component.totalHpOverflow).toBe(8);
  });

  it('sums HP overflow across multiple rows', () => {
    component.rackData = {hp: 20} as any;
    component.rowedRackedModules = [
      [makeRackedModule(1, 0, 0), makeRackedModule(2, 0, 14)], // 28 → overflow=8
      [makeRackedModule(3, 1, 0), makeRackedModule(4, 1, 14)], // 28 → overflow=8
    ];
    fixture.detectChanges();

    expect(component.totalHpOverflow).toBe(16);
  });

  it('marks overflowing modules with the overflow border overlay when overflow > 0', () => {
    component.rackData = {hp: 20} as any;
    component.rowedRackedModules = [[makeRackedModule(1, 0, 0), makeRackedModule(2, 0, 14)]]; // 28 > 20
    fixture.detectChanges();

    expect(component.isModuleOverflowing(0, 1)).toBeTrue();
  });

  it('does not mark modules as overflowing when modules fit within capacity', () => {
    component.rackData = {hp: 40} as any;
    component.rowedRackedModules = [[makeRackedModule(1, 0, 0), makeRackedModule(2, 0, 14)]]; // 28 < 40
    fixture.detectChanges();

    expect(component.isModuleOverflowing(0, 0)).toBeFalse();
    expect(component.isModuleOverflowing(0, 1)).toBeFalse();
  });

  it('isModuleOverflowing returns false when all rows fit within capacity', () => {
    component.rackData = {hp: 40} as any;
    component.rowedRackedModules = [[makeRackedModule(1, 0, 0), makeRackedModule(2, 0, 14)]]; // 28 < 40
    fixture.detectChanges();

    expect(component.isModuleOverflowing(0, 0)).toBeFalse();
  });

  it('removes the row template background when the row contains unracked modules', () => {
    component.rowedRackedModules = [[makeRackedModule(10, null as any, null as any)]];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const rackRow = host.querySelector('.rackRow') as HTMLElement | null;

    expect(rackRow?.classList.contains('row-bg')).toBeFalse();
  });

  it('shows module hover stats only in power analysis mode', () => {
    fixture.detectChanges();

    let host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.moduleHoverStats')).toBeNull();

    rackDetailDataService.analysisMode$.next(RACK_ANALYSIS_MODES.power);
    fixture.detectChanges();

    component.setHoveredModule(moduleRef);
    fixture.detectChanges();

    host = fixture.nativeElement as HTMLElement;
    const hoverStats = host.querySelector('.moduleHoverStats');
    expect(hoverStats).not.toBeNull();
    expect(component.isHoveredModule(moduleRef)).toBeTrue();
    expect(hoverStats?.textContent?.replace(/\s+/g, '').trim()).toContain('HP14HP');
    expect(hoverStats?.textContent?.replace(/\s+/g, '').trim()).toContain('PWRn/a');
  });

  it('shows function hover stats in function analysis mode', () => {
    moduleRef.module.tags = [{
      tag: {
        name: 'VCO',
        type: TagType.Source
      }
    }];
    fixture.detectChanges();

    rackDetailDataService.analysisMode$.next(RACK_ANALYSIS_MODES.function);
    fixture.detectChanges();

    component.setHoveredModule(moduleRef);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const hoverStats = host.querySelector('.moduleHoverStats');
    expect(hoverStats?.textContent?.replace(/\s+/g, '').trim()).toContain('RoleVoices');
    expect(hoverStats?.textContent?.replace(/\s+/g, '').trim()).toContain('TagPrimarytag:VCO');
  });

  it('shows signal hover details, destination highlighting, and minimal lines in signal mode', () => {
    const destination = makeRackedModule(11, 0, 14);
    const unrelated = makeRackedModule(12, 0, 28);
    moduleRef.module.name = 'Voice';
    moduleRef.module.outs = [{id: 101, name: 'Audio Out', isAudio: true}];
    moduleRef.module.tags = [{
      tag: {
        name: 'VCO',
        type: TagType.Source
      },
      voteCount: [{moduletagid: 1}]
    }];
    destination.module.name = 'Filter';
    destination.module.ins = [{id: 201, name: 'Audio In', isAudio: true}];
    destination.module.tags = [{
      tag: {
        name: 'Filter',
        type: TagType.Source
      },
      voteCount: [{moduletagid: 1}]
    }];
    unrelated.module.name = 'Scope';
    component.rowedRackedModules = [[moduleRef, destination, unrelated]];
    fixture.detectChanges();

    rackDetailDataService.analysisMode$.next(RACK_ANALYSIS_MODES.signal);
    fixture.detectChanges();

    component.setHoveredModule(moduleRef);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const signalCard = host.querySelector('.moduleHoverStats--signal');
    const destinationModule = host.querySelector('[data-rack-module-key="11-11-0-14"]') as HTMLElement | null;
    const unrelatedModule = host.querySelector('[data-rack-module-key="12-12-0-28"]');
    const overlayLine = host.querySelector('.signalOverlay__line');

    expect(signalCard?.textContent).toContain('Inputs');
    expect(signalCard?.textContent).toContain('Outputs');
    expect(signalCard?.textContent).toContain('Tags');
    expect(signalCard?.textContent).toContain('Can feed');
    expect(signalCard?.textContent).toContain('Best matches');
    expect(signalCard?.textContent).toContain('Audio');
    expect(signalCard?.textContent).toContain('Filter');
    expect(signalCard?.textContent).toContain('tone shaping');
    expect(destinationModule?.classList.contains('module--signalDestination')).toBeTrue();
    expect(destinationModule?.getAttribute('data-signal-family')).toBe('audio');
    expect(destinationModule?.style.getPropertyValue('--signal-destination-ring-color')).toContain('rgba(226, 82, 60');
    expect(destinationModule?.style.getPropertyValue('--signal-destination-panel-top-color')).toContain('rgba(226, 82, 60');
    expect(destinationModule?.style.getPropertyValue('--signal-destination-panel-bottom-color')).toContain('rgba(226, 82, 60');
    expect(unrelatedModule?.classList.contains('module--signalMuted')).toBeTrue();
    expect(overlayLine).not.toBeNull();
    expect(overlayLine?.getAttribute('stroke')).toBe('#e2523c');
  });

  it('anchors the signal hover card to the left when the module is too close to the right viewport edge', () => {
    moduleRef.module.outs = [{id: 101, name: 'Audio Out', isAudio: true}];
    component.rackViewportElement = document.createElement('div');
    spyOn(component.rackViewportElement, 'getBoundingClientRect').and.returnValue({
      left: 0,
      right: 300,
      top: 0,
      bottom: 300,
      width: 300,
      height: 300,
      x: 0,
      y: 0,
      toJSON: () => ({})
    } as DOMRect);
    fixture.detectChanges();

    rackDetailDataService.analysisMode$.next(RACK_ANALYSIS_MODES.signal);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const moduleElement = host.querySelector('[data-rack-module-key="10-10-0-0"]') as HTMLElement;
    spyOn(moduleElement, 'getBoundingClientRect').and.returnValue({
      left: 210,
      right: 270,
      top: 40,
      bottom: 180,
      width: 60,
      height: 140,
      x: 210,
      y: 40,
      toJSON: () => ({})
    } as DOMRect);

    component.setHoveredModule(moduleRef, moduleElement);
    fixture.detectChanges();

    const signalCard = host.querySelector('.moduleHoverStats--signal');

    expect(signalCard?.classList.contains('moduleHoverStats--signalLeft')).toBeTrue();
  });

  it('opens the module context menu on a deliberate touch long press', () => {
    jasmine.clock().install();
    try {
      (component as any).touchInteractionMode = true;
      const nextSpy = spyOn(component.moduleRightClick$, 'next');

      component.onModulePointerDown({
        pointerType: 'touch',
        clientX: 48,
        clientY: 96
      } as PointerEvent, moduleRef);

      jasmine.clock().tick(550);

      expect(nextSpy).toHaveBeenCalledWith(jasmine.objectContaining({
        rackedModule: moduleRef,
        $event: jasmine.any(MouseEvent)
      }));
      expect(component.isModuleDragDisabled(moduleRef)).toBeTrue();

      component.onModulePointerUp(moduleRef);
      expect(component.isModuleDragDisabled(moduleRef)).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('emits a touch selection on a simple touch tap when primary actions are enabled', () => {
    (component as any).touchInteractionMode = true;
    component.touchPrimaryActionsEnabled = true;
    const selectionSpy = spyOn(component.touchModuleSelected, 'emit');

    component.onModulePointerDown({
      pointerType: 'touch',
      clientX: 48,
      clientY: 96
    } as PointerEvent, moduleRef);

    component.onModulePointerUp({
      pointerType: 'touch',
      clientX: 48,
      clientY: 96
    } as PointerEvent, moduleRef);

    expect(selectionSpy).toHaveBeenCalledWith(moduleRef);
  });

  it('cancels the touch long press when the finger starts moving', () => {
    jasmine.clock().install();
    try {
      (component as any).touchInteractionMode = true;
      const nextSpy = spyOn(component.moduleRightClick$, 'next');

      component.onModulePointerDown({
        pointerType: 'touch',
        clientX: 20,
        clientY: 20
      } as PointerEvent, moduleRef);

      component.onModulePointerMove({
        pointerType: 'touch',
        clientX: 48,
        clientY: 52
      } as PointerEvent, moduleRef);

      jasmine.clock().tick(550);

      expect(nextSpy).not.toHaveBeenCalled();
      expect(component.isModuleDragDisabled(moduleRef)).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('does not emit a touch selection after the long-press secondary menu opens', () => {
    jasmine.clock().install();
    try {
      (component as any).touchInteractionMode = true;
      component.touchPrimaryActionsEnabled = true;
      const selectionSpy = spyOn(component.touchModuleSelected, 'emit');

      component.onModulePointerDown({
        pointerType: 'touch',
        clientX: 48,
        clientY: 96
      } as PointerEvent, moduleRef);

      jasmine.clock().tick(550);

      component.onModulePointerUp({
        pointerType: 'touch',
        clientX: 48,
        clientY: 96
      } as PointerEvent, moduleRef);

      expect(selectionSpy).not.toHaveBeenCalled();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('hides the per-module HP badge outside edit mode', () => {
    component.isCurrentRackEditable = false;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.hpIndicator')).toBeNull();
    expect(host.querySelector('.moduleHoverStats')).toBeNull();
  });

  it('shows the custom row power panel for hovered rows with modules in power analysis mode', () => {
    moduleRef.module.powerPos12 = 120;
    moduleRef.module.powerNeg12 = -45;
    moduleRef.module.powerPos5 = 10;
    fixture.detectChanges();

    component.setHoveredRow(0);

    expect(component.isRowAnalysisPanelVisible(0)).toBeTrue();
    expect(component.shouldShowRowPowerPanel(0, RACK_ANALYSIS_MODES.power)).toBeTrue();
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

    expect(component.isRowAnalysisPanelVisible(0)).toBeTrue();
    expect(component.shouldShowRowPowerPanel(0, RACK_ANALYSIS_MODES.off)).toBeFalse();
  });

  it('shows row function analysis for hovered rows in function mode', () => {
    component.rowedRackedModules = [[
      makeRackedModule(10, 0, 0),
      makeRackedModule(11, 0, 14),
      makeRackedModule(4647, 0, 22)
    ]];
    component.rowedRackedModules[0][0].module.tags = [{id: 1, tag: {id: 1, name: 'VCO', type: TagType.Source}, voteCount: []}];
    component.rowedRackedModules[0][1].module.tags = [{id: 2, tag: {id: 2, name: 'Envelope Gen.', type: TagType.Source}, voteCount: []}];
    fixture.detectChanges();

    component.setHoveredRow(0);

    expect(component.shouldShowRowFunctionPanel(0, RACK_ANALYSIS_MODES.function)).toBeTrue();
    expect(component.rowFunctionBreakdownAt(0)).toEqual(jasmine.objectContaining({
      moduleCount: 3,
      residualCount: 1,
      residualHp: 14
    }));
    expect(component.rowFunctionResidualLabel(0)).toContain('1 module blank or unclassified');
  });

  it('shows row layout analysis for hovered rows in layout mode', () => {
    component.rackData.hp = 40;
    component.rowedRackedModules = [[makeRackedModule(10, 0, 0), makeRackedModule(11, 0, 14)]];
    fixture.detectChanges();

    rackDetailDataService.analysisMode$.next(RACK_ANALYSIS_MODES.layout);
    component.setHoveredRow(0);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const layoutPanel = host.querySelector('.rowPowerPanel--layout');

    expect(component.shouldShowRowLayoutPanel(0, RACK_ANALYSIS_MODES.layout)).toBeTrue();
    expect(component.layoutAnalysis?.wastedHp).toEqual([12]);
    expect(layoutPanel?.textContent?.replace(/\s+/g, '').trim()).toContain('Used28/40HP');
    expect(layoutPanel?.textContent).toContain('12HP spare');
  });

  it('surfaces mixed row formats in layout mode before remix actions are offered', () => {
    component.rowedRackedModules = [[
      makeRackedModule(10, 0, 0, null, null, null, 0),
      makeRackedModule(11, 0, 14, null, null, null, 1),
    ]];
    fixture.detectChanges();

    rackDetailDataService.analysisMode$.next(RACK_ANALYSIS_MODES.layout);
    component.setHoveredRow(0);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const layoutPanel = host.querySelector('.rowPowerPanel--layoutWarning');

    expect(component.layoutAnalysis?.mixedRowIssues).toEqual([{rowIndex: 0, standards: [0, 1]}]);
    expect(layoutPanel?.textContent).toContain('Mixed formats: 3U + Intellijel 1U');
    expect(layoutPanel?.textContent).toContain('Fix row 1 before remixing.');
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

  it('suppresses panel image enter animation for the actively dragged module', () => {
    component.onDragStarted({} as any, moduleRef);

    expect(component.isDragImageAnimationSuppressed(moduleRef)).toBeTrue();
  });

  it('clears panel image enter animation suppression after drag end settles', () => {
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    });

    component.onDragStarted({} as any, moduleRef);
    component.onDragEnded({} as any, moduleRef);

    expect(component.isDragImageAnimationSuppressed(moduleRef)).toBeFalse();
  });

  it('arms drop reveal suppression on drag release before drop cleanup', () => {
    component.onDragReleased({} as any, moduleRef);

    expect(component.isDropRevealSuppressed(moduleRef)).toBeTrue();
  });

  it('clears drop reveal suppression after drag end when no drop cleanup runs', () => {
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    });

    component.onDragReleased({} as any, moduleRef);
    component.onDragEnded({} as any, moduleRef);

    expect(component.isDropRevealSuppressed(moduleRef)).toBeFalse();
  });

  it('suppresses the dropped module reveal until post-drop cleanup finishes', () => {
    const animationFrames: FrameRequestCallback[] = [];
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      animationFrames.push(callback);
      return animationFrames.length;
    });

    component.onDragReleased({} as any, moduleRef);
    component.onDropListDropped({previousContainer: {}, container: {}} as any, 0, moduleRef);

    expect(component.isDropRevealSuppressed(moduleRef)).toBeTrue();
    expect(rackDetailDataService.rackOrderChange$.next).toHaveBeenCalled();

    animationFrames.shift()?.(0);
    expect(component.isDropRevealSuppressed(moduleRef)).toBeTrue();

    animationFrames.shift()?.(0);
    expect(component.isDropRevealSuppressed(moduleRef)).toBeFalse();
  });

  it('keeps panel image suppression active until the dropped module reveal cleanup finishes', () => {
    const animationFrames: FrameRequestCallback[] = [];
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      animationFrames.push(callback);
      return animationFrames.length;
    });

    component.onDragStarted({} as any, moduleRef);
    component.onDragReleased({} as any, moduleRef);
    component.onDragEnded({} as any, moduleRef);
    component.onDropListDropped({previousContainer: {}, container: {}} as any, 0, moduleRef);

    expect(component.isDragImageAnimationSuppressed(moduleRef)).toBeTrue();

    animationFrames.shift()?.(0);
    animationFrames.shift()?.(0);
    animationFrames.shift()?.(0);

    expect(component.isDragImageAnimationSuppressed(moduleRef)).toBeTrue();
    expect(component.isDropRevealSuppressed(moduleRef)).toBeTrue();

    animationFrames.shift()?.(0);

    expect(component.isDragImageAnimationSuppressed(moduleRef)).toBeFalse();
    expect(component.isDropRevealSuppressed(moduleRef)).toBeFalse();
  });

  it('suppresses enter and leave animations for modules that move during a layout update', () => {
    const animationFrames: FrameRequestCallback[] = [];
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    spyOn(window, 'cancelAnimationFrame').and.stub();
    const moduleA = makeRackedModule(10, 0, 0);
    const moduleB = makeRackedModule(11, 1, 0);
    component.rowedRackedModules = [[moduleA], [moduleB]];
    fixture.detectChanges();

    const nextRows = [[moduleB], [moduleA]];
    component.rowedRackedModules = nextRows;
    component.ngOnChanges({
      rowedRackedModules: new SimpleChange([[moduleA], [moduleB]], nextRows, false)
    });
    fixture.detectChanges();

    expect(component.isModuleLayoutMoveAnimating(moduleA)).toBeTrue();
    expect(component.isModuleLayoutMoveAnimating(moduleB)).toBeTrue();
    expect(component.isModuleAnimationSuppressed(moduleA)).toBeTrue();
    expect(component.areLayoutMoveAngularAnimationsDisabled()).toBeTrue();
    expect(animationFrames.length).toBeGreaterThan(0);
  });

  it('animates same-row drop reveals after suppression clears', () => {
    jasmine.clock().install();
    const animationFrames: FrameRequestCallback[] = [];
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      animationFrames.push(callback);
      return animationFrames.length;
    });

    try {
      const sameContainer = {};
      component.onDragReleased({} as any, moduleRef);
      component.onDropListDropped({previousContainer: sameContainer, container: sameContainer} as any, 0, moduleRef);

      animationFrames.shift()?.(0);
      animationFrames.shift()?.(0);

      expect(component.isDropRevealSuppressed(moduleRef)).toBeFalse();
      expect(component.isDropRevealAnimating(moduleRef)).toBeTrue();

      jasmine.clock().tick(225);

      expect(component.isDropRevealAnimating(moduleRef)).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('does not add the reveal animation for cross-row drops', () => {
    const animationFrames: FrameRequestCallback[] = [];
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      animationFrames.push(callback);
      return animationFrames.length;
    });

    component.onDragReleased({} as any, moduleRef);
    component.onDropListDropped({previousContainer: {}, container: {}} as any, 1, moduleRef);

    animationFrames.shift()?.(0);
    animationFrames.shift()?.(0);

    expect(component.isDropRevealAnimating(moduleRef)).toBeFalse();
  });

  it('does not run remix move animation during manual cross-row drop updates', () => {
    jasmine.clock().install();
    const animationFrames: FrameRequestCallback[] = [];
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    spyOn(window, 'cancelAnimationFrame').and.stub();

    try {
      const moduleA = makeRackedModule(10, 0, 0);
      const moduleB = makeRackedModule(11, 1, 0);
      component.rowedRackedModules = [[moduleA], [moduleB]];
      fixture.detectChanges();

      const dropEvent = {previousContainer: {}, container: {}} as CdkDragDrop<ElementRef>;
      component.onDragReleased({}, moduleA);
      component.onDropListDropped(dropEvent, 1, moduleA);
      const nextRows = [[], [moduleB, moduleA]];
      component.rowedRackedModules = nextRows;
      component.ngOnChanges({
        rowedRackedModules: new SimpleChange([[moduleA], [moduleB]], nextRows, false)
      });
      fixture.detectChanges();

      expect(component.isModuleLayoutMoveAnimating(moduleA)).toBeFalse();
      expect(component.isModuleAnimationSuppressed(moduleA)).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
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
    const row0Hot = makeRackedModule(11, 0, 0, 120, -45, 10);
    const row1Warm = makeRackedModule(22, 1, 0, 60, -15, 0);
    const row1Cool = makeRackedModule(33, 1, 1, 24, -6, 0);

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

  it('clears stale hovered rows when rack rows shrink', () => {
    component.rowedRackedModules = [
      [makeRackedModule(11, 0, 0, 90, -30, 0)],
      [makeRackedModule(22, 1, 0, 40, -10, 0)]
    ];
    fixture.detectChanges();

    component.setHoveredRow(1);
    expect(component.isRowAnalysisPanelVisible(1)).toBeTrue();

    component.rowedRackedModules = [[makeRackedModule(11, 0, 0, 90, -30, 0)]];
    component.ngOnChanges({
      rowedRackedModules: {
        currentValue: component.rowedRackedModules,
        previousValue: null,
        firstChange: false,
        isFirstChange: () => false
      }
    });

    expect(component.isRowAnalysisPanelVisible(1)).toBeFalse();
    expect(component.powerAnalysisVisual(component.rowedRackedModules[0][0]).className).toBe('powerAnalysisModule--peak');
  });

  it('marks modules with missing power data in heatmap mode', () => {
    fixture.detectChanges();

    const visual = component.powerAnalysisVisual(moduleRef) as RackPowerHeatmapVisual;
    expect(visual.className).toBe('powerAnalysisModule--missing');
    expect(visual.totalLabel).toBe('n/a');
  });
});
