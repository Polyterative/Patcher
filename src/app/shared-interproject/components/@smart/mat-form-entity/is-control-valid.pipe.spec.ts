import { FormValidPipe } from './is-control-valid.pipe';
import { UntypedFormControl, Validators } from '@angular/forms';

describe('FormValidPipe (isControlValid)', () => {
  let pipe: FormValidPipe;
  const mockCdr = { markForCheck: () => {}, detectChanges: () => {} } as any;

  beforeEach(() => {
    pipe = new FormValidPipe(mockCdr);
  });

  afterEach(() => {
    pipe.ngOnDestroy();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns false for invalid control', () => {
    const ctrl = new UntypedFormControl('', Validators.required);
    expect(pipe.transform(ctrl)).toBeFalse();
  });

  it('returns true for valid control', () => {
    const ctrl = new UntypedFormControl('hello', Validators.required);
    expect(pipe.transform(ctrl)).toBeTrue();
  });

  it('does not re-subscribe on subsequent calls', () => {
    const ctrl = new UntypedFormControl('x');
    pipe.transform(ctrl);
    expect(pipe.subscribed).toBeTrue();
    pipe.transform(ctrl);
    expect(pipe.subscribed).toBeTrue();
  });

  it('updates valid when control value changes', () => {
    const ctrl = new UntypedFormControl('', Validators.required);
    pipe.transform(ctrl);
    expect(pipe.valid).toBeFalse();
    ctrl.setValue('something');
    expect(pipe.valid).toBeTrue();
  });
});
