import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
}                                from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ValidatorFn,
  Validators
}                                from '@angular/forms';
import { Subject }               from 'rxjs';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { SupabaseService }       from 'src/app/features/backend/supabase.service';
import { Rack }                  from 'src/app/models/models';
import { FormTypes }             from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';

interface FormCV {
  id: number,
  name: FormControl;
  a: FormControl;
  b: FormControl;
}

type DataType = Rack;

@Component({
  selector:        'app-rack-editor',
  templateUrl:     './rack-editor.component.html',
  styleUrls:       ['./rack-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackEditorComponent implements OnInit, OnDestroy {
  @Input() data: DataType;
  readonly save$ = new Subject<void>();
  
  // addIN$ = new Subject<[string, number, number, number]>();
  // addOUT$ = new Subject<[string, number, number, number]>();
  // addSwitch$ = new Subject<void>();
  
  types = FormTypes;
  
  // INs$: BehaviorSubject<FormCV[]> = new BehaviorSubject([]);
  // OUTs$: BehaviorSubject<FormCV[]> = new BehaviorSubject([]);
  
  // formGroupA = this.formBuilder.group({});
  // formGroupB = this.formBuilder.group({});
  // formGroupC = this.formBuilder.group({});
  
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
    public dataService: RackDetailDataService
  ) {
    
    // this.addIN$.pipe(takeUntil(this.destroyEvent$))
    //     .subscribe(([name, min, max, id]) => {
    //       const x = [
    //         ...this.INs$.value,
    //         this.createCV(name, min, max, id)
    //       ];
    //       this.INs$.next(x);
    //
    //       this.formGroupA = this.formBuilder.group({});
    //       x.forEach((a, i) => {
    //         this.formGroupA.addControl(`name${ i.toString() }`, a.name);
    //         this.formGroupA.addControl(`a${ i.toString() }`, a.a);
    //         this.formGroupA.addControl(`b${ i.toString() }`, a.b);
    //       });
    //
    //     });
    // this.addOUT$.pipe(takeUntil(this.destroyEvent$))
    //     .subscribe(([name, min, max, id]) => {
    //       const x: any[] = [
    //         ...this.OUTs$.value,
    //         this.createCV(name, min, max, id)
    //       ];
    //       this.OUTs$.next(x);
    //
    //       this.formGroupB = this.formBuilder.group({});
    //       x.forEach((a, i) => {
    //         this.formGroupB.addControl(`name${ i.toString() }`, a.name);
    //         this.formGroupB.addControl(`a${ i.toString() }`, a.a);
    //         this.formGroupB.addControl(`b${ i.toString() }`, a.b);
    //       });
    //
    //     });
    //
    // this.save$.pipe(
    //   map(() => ({
    //     ...this.data,
    //     ins:  this.formCVToCV(this.INs$.value),
    //     outs: this.formCVToCV(this.OUTs$.value)
    //   })),
    //   // switchMap(x => this.backend.update.rack-parts(x)),
    //   switchMap(x => zip(this.backend.update.rack-parts(x))),
    //   withLatestFrom(this.dataService.updateSingleRackData$),
    //   takeUntil(this.destroyEvent$)
    // )
    //     .subscribe(([x, a]) => this.dataService.updateSingleRackData$.next(a));
  
  }
  
  // private serialize(cvs: DataType[]): string {
  //   return JSON.stringify(cvs);
  // }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
  ngOnInit(): void {
    
    // const ins: DataType[] = this.data.ins;
    // ins.forEach(x => this.addIN$.next([
    //   x.name,
    //   x.min,
    //   x.max,
    //   x.id
    // ]));
    // const outs: DataType[] = this.data.outs;
    // outs.forEach(x => this.addOUT$.next([
    //   x.name,
    //   x.min,
    //   x.max,
    //   x.id
    // ]));
  }
  
  //
  // private createCV(name, min, max, id: number) {
  //   return {
  //     name: new FormControl(name, this.validatorsName),
  //     a:    new FormControl(min, this.validatorsNum),
  //     b:    new FormControl(max, this.validatorsNum),
  //     id
  //   };
  // }
  
  // private formCVToCV(formCVS: FormCV[]): DataType[] {
  //   const x = formCVS.map(formCV => ({
  //     name: formCV.name.value,
  //     // description?: string;
  //     id:  formCV.id,
  //     min: formCV.a.value,
  //     max: formCV.b.value
  //     // isVOCT?: boolean;
  //   }));
  //
  //   return x;
  // }
  
}
