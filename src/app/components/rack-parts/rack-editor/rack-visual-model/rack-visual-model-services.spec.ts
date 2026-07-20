import { Subject } from 'rxjs';
import { RackedModule } from 'src/app/models/module';
import { RackMinimal } from 'src/app/models/rack';
import { CV } from 'src/app/models/cv';
import { RACK_ANALYSIS_MODES } from '../../rack-analysis-mode';
import { ModuleRightClick } from '../rack-editor.types';
import { RackVisualModelInteractionService } from './rack-visual-model-interaction.service';
import { RackVisualModelLayoutService } from './rack-visual-model-layout.service';
import { RackVisualModelRenderService } from './rack-visual-model-render.service';
import { RackVisualModelSignalService } from './rack-visual-model-signal.service';

describe('RackVisualModel extracted services', () => {
  const rackFixture = {hp: 32} as RackMinimal;

  function makeRackedModule(
    id: number | undefined,
    row: number,
    column: number,
    hp = 14
  ): RackedModule {
    return {
      module: {
        id,
        name: `Module ${ id }`,
        description: '',
        hp,
        public: true,
        manufacturer: null,
        manufacturerId: 0,
        panels: [],
        ins: [],
        outs: [],
        tags: [],
        standard: {id: 0},
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
      },
      rackingData: {
        id,
        rackid: 1,
        moduleid: id ?? 0,
        row,
        column,
        selectedPanelId: null,
      }
    } as RackedModule;
  }

  describe('RackVisualModelRenderService', () => {
    it('keeps optimistic track keys stable after persistence assigns an id', () => {
      const service = new RackVisualModelRenderService();
      const module = makeRackedModule(undefined, 0, 4);

      const key = service.rackModuleTrackKey(module);
      module.rackingData.id = 42;

      expect(service.rackModuleTrackKey(module)).toBe(key);
    });

    it('updates row overflow and same-HP hover state from current rows', () => {
      const service = new RackVisualModelRenderService();
      const hovered = makeRackedModule(1, 0, 0, 14);
      const sameHp = makeRackedModule(2, 0, 14, 14);
      const overflow = makeRackedModule(3, 0, 28, 20);

      service.update([[hovered, sameHp, overflow]], rackFixture);
      service.setHoveredModule(hovered);

      expect(service.rowHpOverflowAt(0)).toBe(16);
      expect(service.isModuleOverflowing(0, 2, [[hovered, sameHp, overflow]], rackFixture)).toBeTrue();
      expect(service.isSameHpHighlightedModule(sameHp, RACK_ANALYSIS_MODES.layout)).toBeTrue();
    });
  });

  describe('RackVisualModelLayoutService', () => {
    it('emits row move motion for the affected rows and clears it after the animation window', () => {
      jasmine.clock().install();
      try {
        const service = new RackVisualModelLayoutService();
        const markForCheck = jasmine.createSpy('markForCheck');

        service.startRowMoveAnimation({rowId: 1, direction: 'up'}, 2, markForCheck);

        expect(service.rowMoveMotion$.value).toEqual({sourceRowId: 1, targetRowId: 0, direction: 'up'});
        expect(service.isRowMovingUp(0, service.rowMoveMotion$.value)).toBeTrue();
        expect(service.isRowMovingDown(1, service.rowMoveMotion$.value)).toBeTrue();

        jasmine.clock().tick(350);

        expect(service.rowMoveMotion$.value).toBeNull();
        expect(markForCheck).toHaveBeenCalledTimes(2);
      } finally {
        jasmine.clock().uninstall();
      }
    });

    it('suppresses one enter-delay position only during the replacement window', () => {
      jasmine.clock().install();
      try {
        const service = new RackVisualModelLayoutService();

        service.suppressEnterDelayForPosition('0:0', jasmine.createSpy('markForCheck'));

        expect(service.enterAnimationDelay('0:0', 2)).toBe(0);
        expect(service.enterAnimationDelay('0:14', 2)).toBe(100);

        jasmine.clock().tick(225);

        expect(service.enterAnimationDelay('0:0', 2)).toBe(100);
      } finally {
        jasmine.clock().uninstall();
      }
    });
  });

  describe('RackVisualModelSignalService', () => {
    it('tracks signal destinations and muted unrelated modules without requiring overlay geometry', () => {
      const service = new RackVisualModelSignalService();
      const source = makeRackedModule(1, 0, 0);
      const destination = makeRackedModule(2, 0, 14);
      const unrelated = makeRackedModule(3, 0, 28);
      source.module.outs = [{id: 1, name: 'Audio Out', isAudio: true} as CV];
      destination.module.ins = [{id: 2, name: 'Audio In', isAudio: true} as CV];
      const moduleDomKey = (module: RackedModule) => `${ module.rackingData.id }`;

      service.updateSignalAnalysisState({
        hoveredRackedModule: source,
        hoveredModuleElement: null,
        rowedRackedModules: [[source, destination, unrelated]],
        screenElement: null,
        hostElement: document.createElement('div'),
        rackViewportElement: null,
        focusArea: null,
        isSignalModeActive: true,
        moduleDomKey,
        markForCheck: jasmine.createSpy('markForCheck'),
      });

      expect(service.signalDestinationFamily(destination, true, false, moduleDomKey(destination))).toBe('audio');
      expect(service.isSignalMutedModule(unrelated, true, source, false, moduleDomKey(unrelated))).toBeTrue();
    });
  });

  describe('RackVisualModelInteractionService', () => {
    it('emits a synthetic contextmenu event after a deliberate touch long press', () => {
      jasmine.clock().install();
      try {
        const service = new RackVisualModelInteractionService();
        const module = makeRackedModule(1, 0, 0);
        const moduleRightClick$ = new Subject<ModuleRightClick>();
        const nextSpy = spyOn(moduleRightClick$, 'next');
        service.touchInteractionMode = true;

        service.onModulePointerDown(
          {pointerType: 'touch', clientX: 20, clientY: 30} as PointerEvent,
          module,
          true,
          true,
          moduleRightClick$,
          jasmine.createSpy('markForCheck')
        );
        jasmine.clock().tick(550);

        expect(nextSpy).toHaveBeenCalledWith(jasmine.objectContaining({
          rackedModule: module,
          $event: jasmine.any(MouseEvent)
        }));
      } finally {
        jasmine.clock().uninstall();
      }
    });

    it('forwards same-row drops and toggles post-drop suppression around the animation frame', () => {
      jasmine.clock().install();
      try {
        const service = new RackVisualModelInteractionService();
        const module = makeRackedModule(1, 0, 0);
        const rackOrderChange$ = {next: jasmine.createSpy('next')};
        const suppressPostDropReorder = jasmine.createSpy('setSuppressPostDropReorder');
        const markForCheck = jasmine.createSpy('markForCheck');
        const container = {};
        const event = {previousContainer: container, container} as Parameters<RackVisualModelInteractionService['onDropListDropped']>[0];
        spyOn(window, 'requestAnimationFrame').and.callFake(callback => {
          callback(0);
          return 0;
        });

        service.onDropListDropped(
          event,
          0,
          module,
          {rackOrderChange$},
          jasmine.createSpy('suppressLayoutMoveAnimationForManualDrop'),
          suppressPostDropReorder,
          markForCheck
        );
        jasmine.clock().tick(225);

        expect(rackOrderChange$.next).toHaveBeenCalledWith({event, newRow: 0, module});
        expect(suppressPostDropReorder.calls.allArgs()).toEqual([[true], [false]]);
        expect(markForCheck).toHaveBeenCalledTimes(3);
      } finally {
        jasmine.clock().uninstall();
      }
    });
  });
});
