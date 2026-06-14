import { ChangeDetectorRef } from '@angular/core';
import { GetControlValuePipe } from './get-control-value.pipe';
import { FormControl } from '@angular/forms';

describe('GetControlValuePipe', () => {
  let pipe: GetControlValuePipe;
  let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;

  beforeEach(() => {
    mockCdr = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck', 'detectChanges']);
    pipe = new GetControlValuePipe(mockCdr);
  });

  afterEach(() => {
    pipe.ngOnDestroy();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns a ReplaySubject', () => {
    const ctrl = new FormControl('hello');
    const result = pipe.transform(ctrl);
    expect(result).toBeTruthy();
  });

  it('emits the current control value immediately', (done) => {
    const ctrl = new FormControl('initial');
    const result = pipe.transform(ctrl);
    result.subscribe(v => {
      expect(v).toBe('initial');
      done();
    });
  });

  it('emits updated value when control changes', (done) => {
    const ctrl = new FormControl('start');
    const result = pipe.transform(ctrl);
    ctrl.setValue('updated');
    const values: string[] = [];
    result.subscribe(v => values.push(v));
    // ReplaySubject(1) replays latest; after setValue both 'updated' and 'start' may appear
    expect(values[values.length - 1]).toBe('updated');
    done();
  });

  it('does not re-subscribe when transform called again', () => {
    const ctrl = new FormControl('x');
    pipe.transform(ctrl);
    const firstSubscribed = pipe.subscribed;
    pipe.transform(ctrl);
    expect(pipe.subscribed).toBe(firstSubscribed);
  });
});
