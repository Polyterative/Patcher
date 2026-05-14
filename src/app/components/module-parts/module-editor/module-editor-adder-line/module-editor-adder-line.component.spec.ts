import { ModuleEditorAdderLineComponent } from './module-editor-adder-line.component';
import { CV } from 'src/app/models/cv';

describe('ModuleEditorAdderLineComponent', () => {
  let comp: ModuleEditorAdderLineComponent;

  beforeEach(() => {
    comp = new ModuleEditorAdderLineComponent();
  });

  describe('construction', () => {
    it('creates without error', () => {
      expect(comp).toBeTruthy();
    });

    it('has 6 presets', () => {
      expect(comp.presets.length).toBe(6);
    });

    it('first preset is Range unspecified (no min/max)', () => {
      expect(comp.presets[0].label).toBe('Range unspecified');
      expect(comp.presets[0].min).toBeUndefined();
      expect(comp.presets[0].max).toBeUndefined();
    });

    it('last preset is -12 to +12V', () => {
      const last = comp.presets[comp.presets.length - 1];
      expect(last.label).toBe('-12 to +12V');
      expect(last.min).toBe(-12);
      expect(last.max).toBe(12);
    });
  });

  describe('addPreset', () => {
    it('emits CV with min/max from preset', () => {
      const emitted: CV[] = [];
      comp.add$.subscribe(cv => emitted.push(cv));
      comp.addPreset({ label: '0 to +5V', min: 0, max: 5 });
      expect(emitted.length).toBe(1);
      expect(emitted[0].min).toBe(0);
      expect(emitted[0].max).toBe(5);
    });

    it('emits CV with name="" and id=0', () => {
      const emitted: CV[] = [];
      comp.add$.subscribe(cv => emitted.push(cv));
      comp.addPreset({ label: 'Range unspecified' });
      expect(emitted[0].name).toBe('');
      expect(emitted[0].id).toBe(0);
    });

    it('emits CV with isApproved=false', () => {
      const emitted: CV[] = [];
      comp.add$.subscribe(cv => emitted.push(cv));
      comp.addPreset({ label: 'Range unspecified' });
      expect(emitted[0].isApproved).toBeFalse();
    });

    it('emits CV with undefined min/max for unspecified preset', () => {
      const emitted: CV[] = [];
      comp.add$.subscribe(cv => emitted.push(cv));
      comp.addPreset({ label: 'Range unspecified' });
      expect(emitted[0].min).toBeUndefined();
      expect(emitted[0].max).toBeUndefined();
    });
  });
});
