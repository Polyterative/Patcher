import {
  ChangeDetectorRef,
  Pipe,
  PipeTransform
}                    from '@angular/core';
import {
  UntypedFormControl,
  UntypedFormGroup
}                    from '@angular/forms';
import { Subject }   from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type LocalType = UntypedFormControl | UntypedFormGroup;

@Pipe({
  name: 'formValid',
  pure: false
})
export class FormValidPipe implements PipeTransform {
  valid = false;
  subscribed = false;
  
  protected destroyEvent$ = new Subject<void>();

  constructor(public changeDetection: ChangeDetectorRef) {}

  transform(control: LocalType): boolean {

    if (!this.subscribed) {
      this.subscribe(control);
    }

    return this.valid;
  }

  private subscribe(control: LocalType): void {
    control.valueChanges
           .pipe(
             takeUntil(this.destroyEvent$)
           )
           .subscribe(_ => {
             this.updateResult(control);
           });

    this.subscribed = true;

    this.updateResult(control);
  }

  private updateResult(control: LocalType): void {
    this.valid = control.valid;
    this.changeDetection.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();

  }
}
