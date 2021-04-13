import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                   from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ValidatorFn,
  Validators
}                                   from '@angular/forms';
import {
  BehaviorSubject,
  Subject
}                                   from 'rxjs';
import {
  map,
  switchMap,
  withLatestFrom
}                                   from 'rxjs/operators';
import {
  CV,
  DBEuroModule
}                                   from '../../../models/models';
import { FormTypes }                from '../../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { ModuleBrowserDataService } from '../module-browser-data.service';

interface FormCV {
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
export class ModuleEditorComponent implements OnInit {
  @Input() data: DBEuroModule;
  public readonly save$ = new Subject();
  
  addIN$ = new Subject<[string, number, number]>();
  addOUT$ = new Subject<[string, number, number]>();
  addSwitch$ = new Subject();
  
  types = FormTypes;
  
  INs$: BehaviorSubject<FormCV[]> = new BehaviorSubject([]);
  OUTs$: BehaviorSubject<FormCV[]> = new BehaviorSubject([]);
  
  formGroupA = this.formBuilder.group({});
  formGroupB = this.formBuilder.group({});
  formGroupC = this.formBuilder.group({});
  
  
  private validatorsNum: ValidatorFn = Validators.compose([
    // Validators.required,
    Validators.max(12),
    Validators.min(-12)
  ]);
  
  private validatorsName: ValidatorFn = Validators.compose([
    Validators.required,
    Validators.minLength(3),
    Validators.maxLength(36)
  ]);
  
  constructor(
    public formBuilder: FormBuilder,
    public dataService: ModuleBrowserDataService
  ) {
    
    
    this.addIN$
        .subscribe(([name, min, max]) => {
          let x = [
            ...this.INs$.value,
            this.createCV(name, min, max)
          ];
          this.INs$.next(x);
      
          this.formGroupA = this.formBuilder.group({});
          x.forEach((a, i) => {
            this.formGroupA.addControl(`name${ i.toString() }`, a.name);
            this.formGroupA.addControl(`a${ i.toString() }`, a.a);
            this.formGroupA.addControl(`b${ i.toString() }`, a.b);
          });
      
      
        });
    this.addOUT$
        .subscribe(([name, min, max]) => {
          let x: any[] = [
            ...this.OUTs$.value,
            this.createCV(name, min, max)
          ];
          this.OUTs$.next(x);
      
      
          this.formGroupB = this.formBuilder.group({});
          x.forEach((a, i) => {
            this.formGroupB.addControl(`name${ i.toString() }`, a.name);
            this.formGroupB.addControl(`a${ i.toString() }`, a.a);
            this.formGroupB.addControl(`b${ i.toString() }`, a.b);
          });
      
        });
    
    this.save$.pipe(
      map(() => ({
        ...this.data,
        ins:  JSON.stringify(this.formCVToCV(this.INs$.value)),
        outs: JSON.stringify(this.formCVToCV(this.OUTs$.value))
      })),
      switchMap((x) => this.dataService.backend.update.euromodule(x)),
      withLatestFrom(this.dataService.updateSingleData$)
    )
        .subscribe(([x, a]) => this.dataService.updateSingleData$.next(a));
    
    
  }
  
  private createCV(name, min, max): { a: FormControl; b: FormControl; name: FormControl } {
    return {
      name: new FormControl(name, this.validatorsName),
      a:    new FormControl(min, this.validatorsNum),
      b:    new FormControl(max, this.validatorsNum)
    };
  }
  
  private formCVToCV(formCVS: FormCV[]): CV[] {
    let x: { min: any; max: any; name: any }[] = formCVS.map((formCV) => ({
      name: formCV.name.value,
      // description?: string;
      min: formCV.a.value,
      max: formCV.b.value
      // isVOCT?: boolean;
    }));
    
    return x;
  }
  
  ngOnInit(): void {
    
    let ins: CV[] = JSON.parse(this.data.ins);
    ins.forEach(x => this.addIN$.next([
      x.name,
      x.min,
      x.max
    ]));
    let outs: CV[] = JSON.parse(this.data.outs);
    outs.forEach(x => this.addOUT$.next([
      x.name,
      x.min,
      x.max
    ]));
  }
  
}
