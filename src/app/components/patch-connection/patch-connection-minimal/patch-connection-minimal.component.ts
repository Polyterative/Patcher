import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  Output
}                                  from '@angular/core';
import {
  FormControl,
  Validators
}                                  from '@angular/forms';
import { Subject }                 from 'rxjs';
import { PatchConnection }         from 'src/app/models/models';
import { FormTypes }               from '../../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { ModuleMinimalViewConfig } from '../../module-parts/module-minimal/module-minimal.component';

@Component({
  selector:        'app-patch-connection-minimal',
  templateUrl:     './patch-connection-minimal.component.html',
  styleUrls:       ['./patch-connection-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchConnectionMinimalComponent implements OnInit {
  @Input() readonly index?: number;
  @Input() readonly data: PatchConnection;
  @Input() readonly isEditing = false;
  @Input() readonly isCreator = false;
  @Output() readonly remove$ = new Subject<PatchConnection>();
  @Output() readonly create$ = new Subject<PatchConnection>();
  types = FormTypes;
  
  @Input() viewConfig: ModuleMinimalViewConfig = {
    hideLabels:       false,
    hideManufacturer: true,
    hideDescription:  true,
    hideButtons:      true,
    hideHP:           true,
    hideDates:        true
  };
  
  notes = {
    control: new FormControl('', Validators.compose([
      Validators.min(0),
      Validators.max(999)
    ]))
  };
  
  ngOnInit(): void {
    if (this.data.notes) {
      this.notes.control.patchValue(this.data.notes);
    }
    
    this.notes.control.valueChanges.subscribe(value => this.data.notes = value);
    
  }
  
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
}
