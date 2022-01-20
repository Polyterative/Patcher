import {
  ChangeDetectionStrategy,
  Component,
  Input
}                                  from '@angular/core';
import { SupabaseService }         from 'src/app/features/backend/supabase.service';
import { ModuleMinimalViewConfig } from '../../../components/module-parts/module-minimal/module-minimal.component';
import { SubManager }              from '../../../shared-interproject/directives/subscription-manager';
import { UserAreaDataService }     from '../user-area-data.service';

@Component({
  selector:        'app-user-modules',
  templateUrl:     './user-modules.component.html',
  styleUrls:       ['./user-modules.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserModulesComponent extends SubManager {
  @Input() viewConfig: ModuleMinimalViewConfig;
  
  constructor(
    public backend: SupabaseService,
    public dataService: UserAreaDataService
  ) {
    super();
    this.dataService.updateModulesData$.next();
    
  }
  
  
}
