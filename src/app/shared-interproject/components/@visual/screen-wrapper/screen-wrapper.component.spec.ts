import { ScreenWrapperComponent } from './screen-wrapper.component';

function makeComp(): ScreenWrapperComponent {
  return new ScreenWrapperComponent();
}

describe('ScreenWrapperComponent', () => {
  describe('default inputs', () => {
    it('maxSize defaults to "86rem"', () => {
      expect(makeComp().maxSize).toBe('86rem');
    });

    it('sizePreset defaults to undefined', () => {
      expect(makeComp().sizePreset).toBeUndefined();
    });

    it('force defaults to false', () => {
      expect(makeComp().force).toBeFalse();
    });
  });

  describe('resolvedMaxSize', () => {
    it('returns maxSize when no sizePreset', () => {
      const comp = makeComp();
      expect(comp.resolvedMaxSize).toBe('86rem');
    });

    it('returns maxSize override when no sizePreset', () => {
      const comp = makeComp();
      comp.maxSize = '120rem';
      expect(comp.resolvedMaxSize).toBe('120rem');
    });

    it('resolves "default" preset to "86rem"', () => {
      const comp = makeComp();
      comp.sizePreset = 'default';
      expect(comp.resolvedMaxSize).toBe('86rem');
    });

    it('resolves "wide-shell" preset to "130rem"', () => {
      const comp = makeComp();
      comp.sizePreset = 'wide-shell';
      expect(comp.resolvedMaxSize).toBe('130rem');
    });

    it('resolves "full-bleed" preset to "100%"', () => {
      const comp = makeComp();
      comp.sizePreset = 'full-bleed';
      expect(comp.resolvedMaxSize).toBe('100%');
    });

    it('sizePreset takes priority over custom maxSize', () => {
      const comp = makeComp();
      comp.maxSize = '200rem';
      comp.sizePreset = 'full-bleed';
      expect(comp.resolvedMaxSize).toBe('100%');
    });
  });

  describe('ngOnInit', () => {
    it('does not throw', () => {
      const comp = makeComp();
      expect(() => comp.ngOnInit()).not.toThrow();
    });
  });
});
