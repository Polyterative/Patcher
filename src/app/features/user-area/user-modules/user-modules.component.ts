import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ModuleMinimalViewConfig } from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { UserAreaDataService } from '../user-area-data.service';
import { ModuleUtilService } from 'src/app/services/module-util.service';

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
  modules$ = this.dataService.modules$.pipe(
    map(modules => this.moduleUtilService.sortModules(modules, 'type'))
  );
  
  constructor(
    public backend: SupabaseService,
    public dataService: UserAreaDataService,
    private moduleUtilService: ModuleUtilService
  ) {
    super();
    this.dataService.updateModulesData$.next();
  }
  
}
  onSortChange(sortBy: string) {
    this.modules$ = this.modules$.pipe(
      map(modules => this.moduleUtilService.sortModules(modules, sortBy))
    );
  }

  onGroupChange(groupBy: string) {
    this.modules$ = this.modules$.pipe(
      map(modules => {
        if (groupBy === 'type') {
          return this.moduleUtilService.groupModulesByType(modules);
        } else if (groupBy === 'manufacturer') {
          return this.moduleUtilService.groupByManufacturer(modules);
        } else {
          return modules;
        }
      })
    );
  }
