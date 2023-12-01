import { Component, forwardRef, Input, OnDestroy, OnInit } from '@angular/core';
import { ControlValueAccessor, FormBuilder, FormControl, FormGroup, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector:    'lib-days-in-week-picker',
  templateUrl: './days-in-week-picker.component.html',
  providers:   [
    {
      provide:     NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DaysInWeekPickerComponent),
      multi:       true
    }
  ]
})
export class DaysInWeekPickerComponent implements OnInit, OnDestroy, ControlValueAccessor {

  writeValue(obj: number[]): void {
    this.checkboxGroupForm.setValue(this.getDay(a => Array.isArray(obj) && obj.some(c => 'A' + c === a)));
  }

  @Input()
  public disabled = false;

  private onChange = (_: any) => { };

  registerOnChange(fn: (value: any) => any): void { this.onChange = fn; }

  private onTouched = () => { };

  registerOnTouched(fn: () => any): void { this.onTouched = fn; }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled)
      this.checkboxGroupForm.disable();
    else
      this.checkboxGroupForm.enable();

  }

  public readonly days: { id: string, name: string }[] = Array.from(Array(7)
    .keys())
                                                              .map((_, i) => i >= 6 ? 0 : (i + 1))
                                                              .map(i => ({
                                                                name: moment()
                                                                        .day(i)
                                                                        .format('dd'),
                                                                id:   'A' + i
                                                              }));

  public checkboxGroupForm: FormGroup;
  private subscription: Subscription;

  constructor(private readonly formBuilder: FormBuilder) {
  }

  private getDay(fn: (a: string) => any) {
    return this.days.reduce((a, b) => ({
      ...a,
      [b.id]: fn(b.id)
    }), {});
  }

  ngOnInit(): void {
    this.checkboxGroupForm = this.formBuilder.group(this.getDay(_ => new FormControl({
      value:    false,
      disabled: this.disabled
    })), {});
    this.subscription = this.checkboxGroupForm.valueChanges.pipe(
      map(a => Object.entries(a)
                     .filter(b => b[1])
                     .map(b => parseInt(b[0][1])))
    )
                            .subscribe(a => {
                              this.onChange(a);
                              this.onTouched();
                            });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }


}
