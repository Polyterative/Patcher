import {
  ControlValueAccessor,
  FormBuilder
} from '@angular/forms';
import { DaysInWeekPickerComponent } from './days-in-week-picker.component';

// ── Factory ───────────────────────────────────────────────────────────────────

function makeComponent(disabled = false) {
  const comp = new DaysInWeekPickerComponent(new FormBuilder());
  comp.disabled = disabled;
  return comp;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DaysInWeekPickerComponent', () => {

  describe('days array', () => {
    it('has exactly 7 entries', () => {
      const comp = makeComponent();
      expect(comp.days.length).toBe(7);
    });

    it('generates IDs A0 through A6', () => {
      const comp = makeComponent();
      const ids = new Set(comp.days.map(d => d.id));
      for (let i = 0; i <= 6; i++) {
        expect(ids.has(`A${i}`)).toBeTrue();
      }
    });

    it('provides a non-empty name for each day', () => {
      const comp = makeComponent();
      comp.days.forEach(d => expect(d.name.length).toBeGreaterThan(0));
    });
  });

  describe('ngOnInit()', () => {
    it('creates checkboxGroupForm with 7 controls', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      expect(Object.keys(comp.checkboxGroupForm.controls).length).toBe(7);
    });

    it('initialises all controls to false', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      const values: boolean[] = Object.values(comp.checkboxGroupForm.value);
      expect(values.every(v => v === false)).toBeTrue();
    });

    it('disables all controls when disabled=true', () => {
      const comp = makeComponent(true);
      comp.ngOnInit();
      expect(comp.checkboxGroupForm.disabled).toBeTrue();
    });

    it('leaves form enabled when disabled=false', () => {
      const comp = makeComponent(false);
      comp.ngOnInit();
      expect(comp.checkboxGroupForm.enabled).toBeTrue();
    });
  });

  describe('writeValue()', () => {
    it('marks selected day numbers as true', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      comp.writeValue([1, 3]);
      expect(comp.checkboxGroupForm.value['A1']).toBeTrue();
      expect(comp.checkboxGroupForm.value['A3']).toBeTrue();
    });

    it('leaves unselected days as false', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      comp.writeValue([1]);
      expect(comp.checkboxGroupForm.value['A2']).toBeFalse();
      expect(comp.checkboxGroupForm.value['A0']).toBeFalse();
    });

    it('sets all controls to false for an empty array', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      comp.writeValue([1, 2]);
      comp.writeValue([]);
      const values: boolean[] = Object.values(comp.checkboxGroupForm.value);
      expect(values.every(v => v === false)).toBeTrue();
    });

    it('sets all controls to false for a non-array input', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      const accessor: ControlValueAccessor = comp;
      accessor.writeValue(null);
      const values: boolean[] = Object.values(comp.checkboxGroupForm.value);
      expect(values.every(v => v === false)).toBeTrue();
    });

    it('handles all 7 days selected', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      comp.writeValue([0, 1, 2, 3, 4, 5, 6]);
      const values: boolean[] = Object.values(comp.checkboxGroupForm.value);
      expect(values.every(v => v === true)).toBeTrue();
    });
  });

  describe('valueChanges → onChange/onTouched', () => {
    it('calls onChange with the selected day numbers when a control changes', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      const changes: number[][] = [];
      comp.registerOnChange((v: number[]) => changes.push(v));

      comp.checkboxGroupForm.patchValue({ A1: true, A3: true });

      expect(changes.length).toBeGreaterThan(0);
      const last = changes[changes.length - 1];
      expect(last).toContain(1);
      expect(last).toContain(3);
    });

    it('calls onChange with empty array when all controls are unchecked', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      const changes: number[][] = [];
      comp.registerOnChange((v: number[]) => changes.push(v));

      comp.checkboxGroupForm.patchValue({ A2: false });

      const last = changes[changes.length - 1];
      expect(last).toEqual([]);
    });

    it('calls onTouched when a control changes', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      const touchedSpy = jasmine.createSpy('onTouched');
      comp.registerOnTouched(touchedSpy);

      comp.checkboxGroupForm.patchValue({ A4: true });

      expect(touchedSpy).toHaveBeenCalled();
    });
  });

  describe('setDisabledState()', () => {
    it('disables the form when called with true', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      comp.setDisabledState(true);
      expect(comp.checkboxGroupForm.disabled).toBeTrue();
    });

    it('re-enables the form when called with false after disabling', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      comp.setDisabledState(true);
      comp.setDisabledState(false);
      expect(comp.checkboxGroupForm.enabled).toBeTrue();
    });
  });

  describe('registerOnChange() / registerOnTouched()', () => {
    it('stores the onChange callback and calls it on value changes', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      const spy = jasmine.createSpy('onChange');
      comp.registerOnChange(spy);
      comp.checkboxGroupForm.patchValue({ A5: true });
      expect(spy).toHaveBeenCalled();
    });

    it('stores the onTouched callback and calls it on value changes', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      const spy = jasmine.createSpy('onTouched');
      comp.registerOnTouched(spy);
      comp.checkboxGroupForm.patchValue({ A6: true });
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy()', () => {
    it('unsubscribes from the valueChanges subscription', () => {
      const comp = makeComponent();
      comp.ngOnInit();
      const changes: number[][] = [];
      comp.registerOnChange((v: number[]) => changes.push(v));

      comp.ngOnDestroy();
      // After destroy, further value changes should not trigger onChange
      comp.checkboxGroupForm.patchValue({ A1: true });

      // No new changes recorded after destroy
      expect(changes.length).toBe(0);
    });
  });
});
