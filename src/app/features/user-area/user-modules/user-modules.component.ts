import {
  ChangeDetectionStrategy,
  Component,
  Input
}                                  from '@angular/core';
import { SupabaseService }         from 'src/app/features/backend/supabase.service';
import { ModuleMinimalViewConfig } from '../../../components/module-parts/module-minimal/module-minimal.component';
import { SubManager }              from '../../../shared-interproject/directives/subscription-manager';
import { UserAreaDataService }     from '../user-area-data.service';

export interface UserModulesComponentViewConfig {
  hideAddModulesButton: boolean;
}

export const userModulesDefaultViewConfig: UserModulesComponentViewConfig = {
  hideAddModulesButton: false
};

@Component({
  selector:        'app-user-modules',
  templateUrl:     './user-modules.component.html',
  styleUrls:       ['./user-modules.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserModulesComponent extends SubManager {
  @Input() modulesViewConfig: ModuleMinimalViewConfig;
  @Input() userModulesComponentViewConfig: UserModulesComponentViewConfig = userModulesDefaultViewConfig;
  @Input() readonly encloseVertically = true;
  constructor(
    public backend: SupabaseService,
    public dataService: UserAreaDataService
  ) {
    super();
    this.dataService.updateModulesData$.next();
    
  }
  
}
