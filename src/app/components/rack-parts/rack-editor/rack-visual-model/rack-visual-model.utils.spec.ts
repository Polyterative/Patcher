import {
  buildCurvedSignalPath,
  buildRenderedModuleTrackElementMap,
  captureModuleLayoutMoveRects,
  findMovedRackModuleKeys,
  playModuleLayoutMoveAnimations,
  buildSignalOverlayFrame,
  withAlpha,
  resolveRowPowerPanelPlacement,
  resolveSignalHoverCardPlacement
} from './rack-visual-model.utils';
import { RackedModule } from 'src/app/models/module';

const makeRect = (left: number, top: number, width: number, height: number) => ({
  left, top, right: left + width, bottom: top + height, width, height,
  centerX: left + width / 2, centerY: top + height / 2
} as any);

const makeDOMRect = (left: number, top: number, width: number, height: number) => ({
  left, top, right: left + width, bottom: top + height, width, height, x: left, y: top
} as DOMRect);

describe('rack-visual-model.utils', () => {
  describe('buildCurvedSignalPath', () => {
    it('returns a valid SVG path string starting with M', () => {
      const src = makeRect(0, 0, 50, 50);
      const dst = makeRect(100, 0, 50, 50);
      const path = buildCurvedSignalPath(src, dst);
      expect(path).toMatch(/^M\s/);
      expect(path).toContain('C');
    });

    it('handles reversed direction (dst left of src)', () => {
      const src = makeRect(100, 0, 50, 50);
      const dst = makeRect(0, 0, 50, 50);
      const path = buildCurvedSignalPath(src, dst);
      expect(path).toBeTruthy();
    });
  });

  describe('buildSignalOverlayFrame', () => {
    it('calculates relative position correctly', () => {
      const screenRect = makeDOMRect(50, 30, 200, 150);
      const hostRect = makeDOMRect(20, 10, 400, 400);
      const frame = buildSignalOverlayFrame(screenRect, hostRect);
      expect(frame.left).toBe(30);
      expect(frame.top).toBe(20);
      expect(frame.width).toBe(200);
      expect(frame.height).toBe(150);
    });
  });

  describe('layout move helpers', () => {
    const makeModule = (id: number): RackedModule => ({
      module: {id, hp: 8},
      rackingData: {id}
    } as unknown as RackedModule);

    it('finds modules that move by rendered row or column position', () => {
      const moduleA = makeModule(1);
      const moduleB = makeModule(2);
      const moduleC = makeModule(3);

      const movedKeys = findMovedRackModuleKeys(
        [[moduleA, moduleB], [moduleC]],
        [[moduleB, moduleA], [moduleC]],
        module => String(module.rackingData.id)
      );

      expect(Array.from(movedKeys).sort()).toEqual(['1', '2']);
    });

    it('ignores added and removed modules when building move keys', () => {
      const moduleA = makeModule(1);
      const moduleB = makeModule(2);
      const moduleC = makeModule(3);

      const movedKeys = findMovedRackModuleKeys(
        [[moduleA, moduleB]],
        [[moduleA, moduleC]],
        module => String(module.rackingData.id)
      );

      expect(Array.from(movedKeys)).toEqual([]);
    });

    it('captures only rendered modules with stable track keys', () => {
      const screen = document.createElement('div');
      const movedElement = document.createElement('div');
      movedElement.dataset['rackModuleTrackKey'] = '1';
      spyOn(movedElement, 'getBoundingClientRect').and.returnValue(makeDOMRect(24, 48, 80, 120));
      const ignoredElement = document.createElement('div');
      ignoredElement.dataset['rackModuleTrackKey'] = '2';
      screen.append(movedElement, ignoredElement);

      const elementMap = buildRenderedModuleTrackElementMap(screen);
      const snapshots = captureModuleLayoutMoveRects(screen, new Set(['1']));

      expect(elementMap.get('1')).toBe(movedElement);
      expect(elementMap.get('2')).toBe(ignoredElement);
      const snapshot = snapshots.get('1');
      expect(snapshot).toEqual(jasmine.objectContaining({left: 24, top: 48, width: 80, height: 120}));
      expect(snapshots.has('2')).toBeFalse();
    });

    it('animates the post-render element for a moved track key', () => {
      const animationFrames: FrameRequestCallback[] = [];
      spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
        animationFrames.push(callback);
        return animationFrames.length;
      });
      spyOn(window, 'cancelAnimationFrame').and.stub();
      const screen = document.createElement('div');
      const oldElement = document.createElement('div');
      oldElement.dataset['rackModuleTrackKey'] = '1';
      screen.append(oldElement);
      const replacementElement = document.createElement('div');
      replacementElement.dataset['rackModuleTrackKey'] = '1';
      spyOn(replacementElement, 'getBoundingClientRect').and.returnValue(makeDOMRect(34, 58, 80, 120));
      const fakeAnimation = {
        addEventListener: jasmine.createSpy('addEventListener'),
        cancel: jasmine.createSpy('cancel')
      } as unknown as Animation;
      spyOn(replacementElement, 'animate').and.returnValue(fakeAnimation);

      const cancel = playModuleLayoutMoveAnimations(
        screen,
        new Map([['1', {left: 24, top: 48, width: 80, height: 120}]]),
        240,
        1,
        () => {}
      );
      screen.replaceChildren(replacementElement);
      animationFrames[0](0);

      expect(replacementElement.animate).toHaveBeenCalledWith([
        {
          transform: 'translate3d(-10px, -10px, 0) scale(1, 1)', // px-ok: verifies Web Animations transform output
          transformOrigin: 'top left'
        },
        {transform: 'translate3d(0, 0, 0) scale(1, 1)', transformOrigin: 'top left'}
      ], jasmine.objectContaining({duration: jasmine.any(Number)}));
      cancel();
    });

    it('converts viewport deltas into local transform distance when the rack is scaled', () => {
      const animationFrames: FrameRequestCallback[] = [];
      spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
        animationFrames.push(callback);
        return animationFrames.length;
      });
      spyOn(window, 'cancelAnimationFrame').and.stub();
      const screen = document.createElement('div');
      const element = document.createElement('div');
      element.dataset['rackModuleTrackKey'] = '1';
      spyOn(element, 'getBoundingClientRect').and.returnValue(makeDOMRect(34, 58, 80, 120));
      const fakeAnimation = {
        addEventListener: jasmine.createSpy('addEventListener'),
        cancel: jasmine.createSpy('cancel')
      } as unknown as Animation;
      spyOn(element, 'animate').and.returnValue(fakeAnimation);
      screen.append(element);

      const cancel = playModuleLayoutMoveAnimations(
        screen,
        new Map([['1', {left: 24, top: 48, width: 80, height: 120}]]),
        620,
        0.5,
        () => {}
      );
      animationFrames[0](0);

      expect(element.animate).toHaveBeenCalledWith([
        {
          transform: 'translate3d(-20px, -20px, 0) scale(1, 1)', // px-ok: verifies scaled Web Animations transform output
          transformOrigin: 'top left'
        },
        {transform: 'translate3d(0, 0, 0) scale(1, 1)', transformOrigin: 'top left'}
      ], jasmine.objectContaining({
        duration: jasmine.any(Number),
        easing: 'cubic-bezier(0.2, 0, 0, 1)'
      }));
      cancel();
    });

    it('eases module size changes instead of snapping when a moved element resolves at a new size', () => {
      const animationFrames: FrameRequestCallback[] = [];
      spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
        animationFrames.push(callback);
        return animationFrames.length;
      });
      spyOn(window, 'cancelAnimationFrame').and.stub();
      const screen = document.createElement('div');
      const element = document.createElement('div');
      element.dataset['rackModuleTrackKey'] = '1';
      spyOn(element, 'getBoundingClientRect').and.returnValue(makeDOMRect(34, 58, 120, 80));
      const fakeAnimation = {
        addEventListener: jasmine.createSpy('addEventListener'),
        cancel: jasmine.createSpy('cancel')
      } as unknown as Animation;
      spyOn(element, 'animate').and.returnValue(fakeAnimation);
      screen.append(element);

      const cancel = playModuleLayoutMoveAnimations(
        screen,
        new Map([['1', {left: 34, top: 58, width: 60, height: 40}]]),
        620,
        1,
        () => {}
      );
      animationFrames[0](0);

      expect(element.animate).toHaveBeenCalledWith([
        {
          transform: 'translate3d(0px, 0px, 0) scale(0.5, 0.5)', // px-ok: verifies Web Animations transform output
          transformOrigin: 'top left'
        },
        {transform: 'translate3d(0, 0, 0) scale(1, 1)', transformOrigin: 'top left'}
      ], jasmine.objectContaining({duration: 620}));
      cancel();
    });
  });

  describe('withAlpha', () => {
    it('converts #hex to rgba with alpha', () => {
      const result = withAlpha('#ff0000', 0.5);
      expect(result).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('handles shorthand 3-char hex', () => {
      const result = withAlpha('#f00', 1);
      expect(result).toBe('rgba(255, 0, 0, 1)');
    });

    it('handles hex without #', () => {
      const result = withAlpha('00ff00', 0.8);
      expect(result).toBe('rgba(0, 255, 0, 0.8)');
    });
  });

  describe('resolveRowPowerPanelPlacement', () => {
    it('returns above when null elements', () => {
      expect(resolveRowPowerPanelPlacement(null, null, 100)).toBe('above');
    });

    it('returns below when no space above', () => {
      const viewport = { getBoundingClientRect: () => makeDOMRect(0, 0, 800, 600) } as any;
      const row = { getBoundingClientRect: () => makeDOMRect(0, 10, 800, 30) } as any;
      expect(resolveRowPowerPanelPlacement(viewport, row, 200)).toBe('below');
    });
  });

  describe('resolveSignalHoverCardPlacement', () => {
    it('returns right when null elements', () => {
      expect(resolveSignalHoverCardPlacement(null, null, 200, 8)).toBe('right');
    });

    it('returns right by default when space available', () => {
      const viewport = { getBoundingClientRect: () => makeDOMRect(0, 0, 800, 600) } as any;
      const module = { getBoundingClientRect: () => makeDOMRect(0, 0, 100, 50) } as any;
      expect(resolveSignalHoverCardPlacement(module, viewport, 200, 8)).toBe('right');
    });
  });
});
