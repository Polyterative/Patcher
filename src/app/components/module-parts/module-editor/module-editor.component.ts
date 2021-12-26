import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
}                                  from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators
}                                  from '@angular/forms';
import {
  BehaviorSubject,
  concat,
  Subject
}                                  from 'rxjs';
import {
  map,
  switchMap,
  takeUntil,
  withLatestFrom
}                                  from 'rxjs/operators';
import { SupabaseService }         from 'src/app/features/backend/supabase.service';
import {
  CV,
  DbModule
}                                  from 'src/app/models/models';
import { FormTypes }               from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { ModuleDetailDataService } from '../module-detail-data.service';

interface FormCV {
  id: number;
  name: FormControl;
  a: FormControl;
  b: FormControl;
}

@Component({
  selector:        'app-module-editor',
  templateUrl:     './module-editor.component.html',
  styleUrls:       ['./module-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleEditorComponent implements OnInit, OnDestroy {
  @Input() data: DbModule;
  readonly save$ = new Subject<void>();
  
  removeIN$ = new Subject<number>();
  removeOUT$ = new Subject<number>();
  //
  addIN$ = new Subject<[string, number, number, number]>();
  addOUT$ = new Subject<[string, number, number, number]>();
  addSwitch$ = new Subject<void>();
  
  types = FormTypes;
  
  INs$: BehaviorSubject<FormCV[]> = new BehaviorSubject([]);
  OUTs$: BehaviorSubject<FormCV[]> = new BehaviorSubject([]);
  
  formGroupA = this.formBuilder.group({});
  formGroupB = this.formBuilder.group({});
  formGroupC = this.formBuilder.group({});
  
  protected destroyEvent$ = new Subject<void>();
  
  private validatorsNum: ValidatorFn = Validators.compose([
    // Validators.required,
    Validators.max(12),
    Validators.min(-12)
  ]);
  
  private validatorsName: ValidatorFn = Validators.compose([
    Validators.required,
    Validators.minLength(1),
    Validators.maxLength(36)
  ]);
  
  constructor(
    public backend: SupabaseService,
    public formBuilder: FormBuilder,
    public dataService: ModuleDetailDataService
  ) {
  
    this.addIN$.pipe(takeUntil(this.destroyEvent$))
        .subscribe(([name, min, max, id]) => {
          const x = [
            ...this.INs$.value,
            this.createCV(name, min, max, id)
          ];
  
          this.updateFormGroupAndContainer(x, this.formGroupA, this.INs$);
  
        });
  
    this.addOUT$.pipe(takeUntil(this.destroyEvent$))
        .subscribe(([name, min, max, id]) => {
          const x: any[] = [
            ...this.OUTs$.value,
            this.createCV(name, min, max, id)
          ];
    
          this.updateFormGroupAndContainer(x, this.formGroupB, this.OUTs$);
    
        });
  
    this.removeIN$.pipe(takeUntil(this.destroyEvent$))
        .subscribe(i => {
          const x = this.INs$.value;
          x.splice(i, 1);
    
          this.updateFormGroupAndContainer(x, this.formGroupA, this.INs$);
        });
  
    this.removeOUT$.pipe(takeUntil(this.destroyEvent$))
        .subscribe(i => {
          const x = this.OUTs$.value;
          x.splice(i, 1);
    
          this.updateFormGroupAndContainer(x, this.formGroupB, this.OUTs$);
        });
  
    this.save$.pipe(
      map(() => ({
        ...this.data,
        ins:  this.formCVToCV(this.INs$.value),
        outs: this.formCVToCV(this.OUTs$.value)
      })),
      // switchMap(x => this.backend.update.module(x)),
      switchMap(x => concat(
        this.backend.update.moduleINsOUTs(x),
        this.backend.update.module(x)
      )),
      withLatestFrom(this.dataService.updateSingleModuleData$),
      takeUntil(this.destroyEvent$)
    )
        .subscribe(([x, a]) => this.dataService.updateSingleModuleData$.next(a));
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
  ngOnInit(): void {
    
    const ins: CV[] = this.data.ins;
    ins.forEach(x => this.addIN$.next([
      x.name,
      x.min,
      x.max,
      x.id
    ]));
    const outs: CV[] = this.data.outs;
    outs.forEach(x => this.addOUT$.next([
      x.name,
      x.min,
      x.max,
      x.id
    ]));
  }
  
  private updateFormGroupAndContainer(cvs: FormCV[], group: FormGroup, subject: BehaviorSubject<FormCV[]>): void {
    subject.next(cvs);
    
    for (let key in group.controls) {
      group.removeControl(key);
    }
    
    cvs.forEach((a, i) => {
      group.addControl(`name${ i.toString() }`, a.name);
      group.addControl(`a${ i.toString() }`, a.a);
      group.addControl(`b${ i.toString() }`, a.b);
    });
  }
  
  private serialize(cvs: CV[]): string {
    return JSON.stringify(cvs);
  }
  
  private createCV(name, min, max, id: number) {
    return {
      name: new FormControl(name, this.validatorsName),
      a:    new FormControl(min, this.validatorsNum),
      b:    new FormControl(max, this.validatorsNum),
      id
    };
  }
  
  private formCVToCV(formCVS: FormCV[]): CV[] {
    const x = formCVS.map(formCV => ({
      name: formCV.name.value,
      // description?: string;
      id:  formCV.id,
      min: formCV.a.value,
      max: formCV.b.value
      // isVOCT?: boolean;
    }));
    
    return x;
  }
  
}
