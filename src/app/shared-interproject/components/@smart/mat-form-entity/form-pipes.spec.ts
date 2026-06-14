import { ChangeDetectorRef } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { FormValidPipe } from './is-control-valid.pipe';
import { GetControlValuePipe } from './get-control-value.pipe';

// ── Shared mock ───────────────────────────────────────────────────────────────

function makeCdr(): jasmine.SpyObj<ChangeDetectorRef> {
  return jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']);
}

// ── FormValidPipe ─────────────────────────────────────────────────────────────

describe('FormValidPipe', () => {

  describe('initial validity', () => {
    it('returns true when control starts valid', () => {
      const pipe = new FormValidPipe(makeCdr());
      const ctrl = new FormControl('value', Validators.required);
      expect(pipe.transform(ctrl)).toBe(true);
    });

    it('returns false when control starts invalid', () => {
      const pipe = new FormValidPipe(makeCdr());
      const ctrl = new FormControl('', Validators.required);
      expect(pipe.transform(ctrl)).toBe(false);
    });

    it('calls cdr.detectChanges on first transform', () => {
      const cdr = makeCdr();
      const pipe = new FormValidPipe(cdr);
      const ctrl = new FormControl('val');
      pipe.transform(ctrl);
      expect(cdr.detectChanges).toHaveBeenCalled();
    });
  });

  describe('subscribes only once', () => {
    it('does not resubscribe on subsequent calls', () => {
      const pipe = new FormValidPipe(makeCdr());
      const ctrl = new FormControl('');
      pipe.transform(ctrl);
      const subscribed = pipe.subscribed;
      pipe.transform(ctrl);
      expect(pipe.subscribed).toBe(subscribed);
    });
  });

  describe('reactivity', () => {
    it('updates valid to true when control becomes valid', () => {
      const pipe = new FormValidPipe(makeCdr());
      const ctrl = new FormControl('', Validators.required);
      pipe.transform(ctrl);
      expect(pipe.valid).toBe(false);

      ctrl.setValue('hello');
      expect(pipe.valid).toBe(true);
    });

    it('updates valid to false when control becomes invalid', () => {
      const pipe = new FormValidPipe(makeCdr());
      const ctrl = new FormControl('hello', Validators.required);
      pipe.transform(ctrl);
      expect(pipe.valid).toBe(true);

      ctrl.setValue('');
      expect(pipe.valid).toBe(false);
    });
  });

  describe('ngOnDestroy()', () => {
    it('stops listening after destroy', () => {
      const cdr = makeCdr();
      const pipe = new FormValidPipe(cdr);
      const ctrl = new FormControl('', Validators.required);
      pipe.transform(ctrl);
      const callsBefore = cdr.detectChanges.calls.count();

      pipe.ngOnDestroy();
      ctrl.setValue('post-destroy value');

      expect(cdr.detectChanges.calls.count()).toBe(callsBefore);
    });
  });
});

// ── GetControlValuePipe ───────────────────────────────────────────────────────

describe('GetControlValuePipe', () => {

  function snapshot(pipe: GetControlValuePipe): string {
    let result: string;
    pipe.value$.subscribe(v => (result = v)).unsubscribe();
    return result!;
  }

  describe('initial value', () => {
    it('emits the current control value immediately', () => {
      const pipe = new GetControlValuePipe(makeCdr());
      const ctrl = new FormControl('initial');
      pipe.transform(ctrl);
      expect(snapshot(pipe)).toBe('initial');
    });

    it('emits empty string for a blank control', () => {
      const pipe = new GetControlValuePipe(makeCdr());
      const ctrl = new FormControl('');
      pipe.transform(ctrl);
      expect(snapshot(pipe)).toBe('');
    });

    it('returns the value$ ReplaySubject', () => {
      const pipe = new GetControlValuePipe(makeCdr());
      const ctrl = new FormControl('test');
      const result = pipe.transform(ctrl);
      expect(result).toBe(pipe.value$);
    });
  });

  describe('subscribes only once', () => {
    it('does not resubscribe on subsequent calls', () => {
      const pipe = new GetControlValuePipe(makeCdr());
      const ctrl = new FormControl('');
      pipe.transform(ctrl);
      pipe.transform(ctrl);
      expect(pipe.subscribed).toBe(true);
    });
  });

  describe('reactivity', () => {
    it('emits updated value when control changes', () => {
      const pipe = new GetControlValuePipe(makeCdr());
      const ctrl = new FormControl('before');
      pipe.transform(ctrl);

      ctrl.setValue('after');
      expect(snapshot(pipe)).toBe('after');
    });
  });

  describe('ngOnDestroy()', () => {
    it('stops emitting after destroy', () => {
      const pipe = new GetControlValuePipe(makeCdr());
      const ctrl = new FormControl('');
      pipe.transform(ctrl);

      const values: string[] = [];
      pipe.value$.subscribe(v => values.push(v));
      pipe.ngOnDestroy();
      ctrl.setValue('post-destroy');

      // The last value should be whatever was emitted before destroy, not the post-destroy value
      expect(values).not.toContain('post-destroy');
    });
  });
});
