import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormControl
} from '@angular/forms';
import { Subject } from 'rxjs';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  UserModulesComponentViewConfig,
  userModulesDefaultViewConfig
} from 'src/app/features/routes/user-area/user-modules/user-modules.component';
import { Patch } from 'src/app/models/patch';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from '../../module-parts/module-minimal/module-minimal.component';


interface FormCV {
  id: number;
  name: UntypedFormControl;
  a: UntypedFormControl;
  b: UntypedFormControl;
}

@Component({
  selector:        'app-patch-editor',
  templateUrl:     './patch-editor.component.html',
  styleUrls:       ['./patch-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchEditorComponent implements OnInit, OnDestroy {
  @Input() data: Patch;
  //
  modulesViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideLabels:        true,
    hideManufacturer:  true,
    hideDescription:   true,
    hideButtons:       true,
    hideHP:            true,
    hideDates:         true,
    hidePanelsOptions: true
  };
  //
  userModulesComponentViewConfig: UserModulesComponentViewConfig = {
    ...userModulesDefaultViewConfig,
    hideAddModulesButton: true
  };
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public backend: SupabaseService,
    public formBuilder: UntypedFormBuilder,
    public dataService: PatchDetailDataService
  ) {
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
  ngOnInit(): void {
  }
  
}