import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  ChangeDetectorRef,
  Pipe,
  PipeTransform, OnDestroy
} from '@angular/core';
import {
  UntypedFormControl,
  UntypedFormGroup
} from '@angular/forms';
import {
  merge,
  Subject
} from 'rxjs';
import { takeUntil } from 'rxjs/operators';


type LocalType = UntypedFormControl | UntypedFormGroup;

@Pipe({
  name: 'formValid',
  pure: false,
  standalone: true
})
export class FormValidPipe extends SubManager implements PipeTransform, OnDestroy {
  valid = false;
  subscribed = false;

  constructor(public changeDetection: ChangeDetectorRef) {
    super();
  }

  transform(control: LocalType): boolean {

    if (!this.subscribed) {
      this.subscribe(control);
    }

    return this.valid;
  }

  private subscribe(control: LocalType): void {
    merge(control.valueChanges, control.statusChanges)
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
    this.valid = control.valid;
    this.changeDetection.detectChanges();
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();

  }
}