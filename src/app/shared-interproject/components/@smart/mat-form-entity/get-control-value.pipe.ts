import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ReplaySubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type LocalType = FormControl | FormGroup;

/*
 * Returns the current value of the form control
 * Solves the problem of the form control valueChanges not outputting anything at subscription time
 */
@Pipe({
  name: 'getControlValue'
})
export class GetControlValuePipe extends SubManager implements PipeTransform, OnDestroy {
  value$ = new ReplaySubject<string>(1);
  subscribed = false;
  
  constructor(public changeDetection: ChangeDetectorRef) {
    super();
  }
  
  transform(control: LocalType): ReplaySubject<string> {
    
    this.value$.next(control.value);
    
    if (!this.subscribed) {
      this.subscribe(control);
    }
    
    return this.value$;
  }
  
  private subscribe(control: LocalType): void {
    control.valueChanges
           .pipe(
             this.takeUntilDestroyed()
           )
           .subscribe(_ => {
             this.updateResult(control);
           });
    
    this.subscribed = true;
    
    this.updateResult(control);
  }
  
  private updateResult(control: LocalType): void {
    this.value$.next(control.value);
  }
  
  ngOnDestroy(): void {
    super.ngOnDestroy();
    
  }
}
