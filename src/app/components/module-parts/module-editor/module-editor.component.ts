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
  fadeInExpandOnEnterAnimation,
  fadeOutCollapseOnLeaveAnimation
}                                  from 'angular-animations';
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
import { FormTypes }               from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { UserManagementService }   from '../../../features/backbone/login/user-management.service';
import { CV }                      from '../../../models/cv';
import { DbModule }                from '../../../models/module';
import { ModuleDetailDataService } from '../module-detail-data.service';

export interface FormCV {
  id: number;
  name: FormControl;
  a: FormControl;
  b: FormControl;
  isApproved: boolean;
}

@Component({
  selector:        'app-module-editor',
  templateUrl:     './module-editor.component.html',
  styleUrls:       ['./module-editor.component.scss'],
  animations:      [
    fadeInExpandOnEnterAnimation(
      {
        duration: 250,
        anchor:   'enter'
      }
    ),
    fadeOutCollapseOnLeaveAnimation(
      {
        duration: 250,
        anchor:   'exit'
      }
    )
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleEditorComponent implements OnInit, OnDestroy {
  @Input() data: DbModule;
  readonly save$ = new Subject<void>();
  
  removeIN$ = new Subject<number>();
  removeOUT$ = new Subject<number>();
  //
  addIN$ = new Subject<CV>();
  addOUT$ = new Subject<CV>();
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
    public dataService: ModuleDetailDataService,
    public userManagementService: UserManagementService
  ) {
  
    this.addIN$.pipe(takeUntil(this.destroyEvent$))
        .subscribe(cv => {
          const formCVS: FormCV[] = [
            ...this.INs$.value,
            this.createFomCV(cv)
          ];
          this.updateFormGroupAndContainer(
            formCVS,
            this.formGroupA,
            this.INs$
          );
  
        });
  
    this.addOUT$.pipe(takeUntil(this.destroyEvent$))
        .subscribe(cv => {
          const formCVS: FormCV[] = [
            ...this.OUTs$.value,
            this.createFomCV(cv)
          ];
          this.updateFormGroupAndContainer(
            formCVS,
            this.formGroupB,
            this.OUTs$
          );
  
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
      switchMap(x => concat(
        this.backend.update.moduleINsOUTs(x),
        this.backend.update.module(x)
      )),
      withLatestFrom(this.dataService.updateSingleModuleData$),
      takeUntil(this.destroyEvent$)
    )
        .subscribe(([x, updateSingleModuleData]) => this.dataService.updateSingleModuleData$.next(
          updateSingleModuleData)
        );
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  
  }
  
  ngOnInit(): void {
    
    const ins: CV[] = this.data.ins;
    ins.forEach(x => this.addIN$.next(x));
    const outs: CV[] = this.data.outs;
    outs.forEach(x => this.addOUT$.next(x));
  
  }
  
  private updateFormGroupAndContainer(cvs: FormCV[], group: FormGroup, subject: BehaviorSubject<FormCV[]>): void {
    subject.next(cvs);
  
    for (const key in group.controls) {
      group.removeControl(key);
    }
  
    // only add CV not yet saved on backend
    cvs.filter(cv => cv.id === 0)
       .forEach((a, i) => {
         group.addControl(`name${ i.toString() }`, a.name);
         group.addControl(`a${ i.toString() }`, a.a);
         group.addControl(`b${ i.toString() }`, a.b);
       });
  }
  
  private serialize(cvs: CV[]): string {
    return JSON.stringify(cvs);
  }
  
  private createFomCV(data: Partial<CV>): FormCV {
    const toReturn: { a: FormControl; b: FormControl; name: FormControl; id: number; isApproved: boolean } = {
      name:       new FormControl(data.name, this.validatorsName),
      a:          new FormControl(data.min, this.validatorsNum),
      b:          new FormControl(data.max, this.validatorsNum),
      id:         data.id,
      isApproved: data.isApproved
    };
  
    // disable if has been uploaded already on the server
    if (data.id > 0) {
      toReturn.name.disable();
      toReturn.a.disable();
      toReturn.b.disable();
    }
  
    return toReturn;
  }
  
  private formCVToCV(formCVS: FormCV[]): CV[] {
    const x = formCVS.map(formCV => ({
      name: formCV.name.value,
      // description?: string;
      id:         formCV.id,
      min:        formCV.a.value,
      max:        formCV.b.value,
      isApproved: formCV.isApproved ? formCV.isApproved : false
      // isVOCT?: boolean;
    }));
  
    return x;
  }
  
}
