import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                          from '@angular/core';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { DbModule }        from '../../../models/module';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
}                          from '../module-minimal/module-minimal.component';

@Component({
  selector:        'app-module-details',
  templateUrl:     './module-details.component.html',
  styleUrls:       ['./module-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleDetailsComponent implements OnInit {
  @Input() data: DbModule;
  @Input() viewConfig: ModuleMinimalViewConfig = defaultModuleMinimalViewConfig;
  
  switches = [];
  
  constructor(
    public backend: SupabaseService
    // userManagerService: UserManagementService
  ) {
    // console.error(patchService);
  }
  
  ngOnInit(): void {
  }
  
}
