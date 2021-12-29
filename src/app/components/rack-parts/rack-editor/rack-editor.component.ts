import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                  from '@angular/core';
import { MatSnackBar }             from '@angular/material/snack-bar';
import { RackDetailDataService }   from 'src/app/components/rack-parts/rack-detail-data.service';
import { SupabaseService }         from 'src/app/features/backend/supabase.service';
import { RackMinimal }             from 'src/app/models/models';
import { SubManager }              from '../../../shared-interproject/directives/subscription-manager';
import { ModuleMinimalViewConfig } from '../../module-parts/module-minimal/module-minimal.component';

@Component({
  selector:        'app-rack-editor',
  templateUrl:     './rack-editor.component.html',
  styleUrls:       ['./rack-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackEditorComponent extends SubManager implements OnInit {
  @Input() data: RackMinimal;
  
  
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public dataService: RackDetailDataService
    // userManagerService: UserManagementService
  ) { super(); }
  
  
  viewConfig: ModuleMinimalViewConfig = {
    hideLabels:       true,
    hideManufacturer: false,
    hideDescription:  false,
    hideButtons:      true,
    hideHP:           false,
    hideDates:        true
  };
  
  ngOnInit(): void {
  
  
  }
  
}
