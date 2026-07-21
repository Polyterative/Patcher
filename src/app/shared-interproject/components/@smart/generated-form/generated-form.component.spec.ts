import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { GeneratedFormComponent } from './generated-form.component';
import { AppStateService } from '../../../app-state.service';
import { FormTypes } from '../mat-form-entity/form-element-models';
import { GeneratedForm } from './generated-form-models';
import { of } from 'rxjs';

function mockAppState(): AppStateService {
  const breakpointObserver = jasmine.createSpyObj<BreakpointObserver>('BreakpointObserver', ['observe']);
  const breakpointState: BreakpointState = { matches: false, breakpoints: {} };
  breakpointObserver.observe.and.returnValue(of(breakpointState));
  return new AppStateService(breakpointObserver);
}

describe('GeneratedFormComponent', () => {
  let comp: GeneratedFormComponent;

  beforeEach(() => {
    comp = new GeneratedFormComponent(mockAppState());
  });

  describe('construction', () => {
    it('creates without error', () => {
      expect(comp).toBeTruthy();
    });

    it('separationTreshold defaults to 4', () => {
      expect(comp.separationTreshold).toBe(4);
    });

    it('hideOldValue defaults to undefined', () => {
      expect(comp.hideOldValue).toBeUndefined();
    });

    it('controlTypes is FormTypes', () => {
      expect(comp.controlTypes).toBe(FormTypes);
    });
  });

  describe('inputs', () => {
    it('accepts controls assignment', () => {
      const controls: GeneratedForm.AutoFormEntity[][] = [[]];
      comp.controls = controls;
      expect(comp.controls).toBe(controls);
    });

    it('accepts oldControls assignment', () => {
      const old: GeneratedForm.AutoFormEntity[][] = [[]];
      comp.oldControls = old;
      expect(comp.oldControls).toBe(old);
    });

    it('accepts custom separationTreshold', () => {
      comp.separationTreshold = 8;
      expect(comp.separationTreshold).toBe(8);
    });
  });
});
