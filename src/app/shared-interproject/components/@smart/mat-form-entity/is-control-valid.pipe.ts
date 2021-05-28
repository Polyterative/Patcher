import {
  ChangeDetectorRef,
  Pipe,
  PipeTransform
}                      from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject }     from 'rxjs';
import { takeUntil }   from 'rxjs/operators';

@Pipe({
  name: 'isControlValid',
  pure: false
})
export class IsControlValidPipe implements PipeTransform {
  valid = false;
  subscribed = false;
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  constructor(public changeDetection: ChangeDetectorRef) {}
  
  transform(control: FormControl): boolean {
    
    if (!this.subscribed) {
      this.subscribe(control);
    }
    
    return this.valid;
  }
  
  private subscribe(control: FormControl): void {
    control.valueChanges
           .pipe(
             takeUntil(this.destroyEvent$)
           )
           .subscribe(value => {
             this.updateResult(control);
           });
    
    this.subscribed = true;
    
    this.updateResult(control);
  }
  
  private updateResult(control: FormControl): void {
    this.valid = control.valid;
    this.changeDetection.detectChanges();
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
