import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { ModuleMinimalViewConfig } from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  UserAreaDataService,
  UserModuleCollectionFilter
} from 'src/app/features/routes/user-area/user-area-data.service';


export interface UserModulesComponentViewConfig {
  hideAddModulesButton: boolean;
}

export const userModulesDefaultViewConfig: UserModulesComponentViewConfig = {
  hideAddModulesButton: false
};

@Component({
  selector: 'app-user-modules',
  templateUrl: './user-modules.component.html',
  styleUrls: ['./user-modules.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class UserModulesComponent extends SubManager {
  @Input() modulesViewConfig: ModuleMinimalViewConfig;
  @Input() userModulesComponentViewConfig: UserModulesComponentViewConfig = userModulesDefaultViewConfig;
  @Input() readonly encloseVertically = true;
  @Input() globalSearchQuery = '';
  readonly collectionFilters: {value: UserModuleCollectionFilter; label: string; icon: string}[] = [
    {value: 'MY_MODULES', label: 'My Modules', icon: 'inventory_2'},
    {value: 'WISHLIST', label: 'Wishlist', icon: 'bookmark'},
  ];
  readonly emptyStateCopyByFilter: Record<UserModuleCollectionFilter, string> = {
    MY_MODULES: 'Add the modules you own or are selling here so they are available when you build racks and patches.',
    WISHLIST: 'Mark modules as wanted from the library to build your wishlist.'
  };
  readonly emptyStateTipsByFilter: Record<UserModuleCollectionFilter, { icon: string; html: string }[]> = {
    MY_MODULES: [
      { icon: 'add', html: 'Open a module from the library and hit the <strong>+ in the bottom-left</strong> to mark it as owned or for sale.' },
      { icon: 'upload', html: 'Missing one? <strong>Submit NEW</strong> to add it to Patcher.' }
    ],
    WISHLIST: [
      { icon: 'add', html: 'Open a module from the library and hit the <strong>+ in the bottom-left</strong> to mark it as wanted.' },
      { icon: 'upload', html: 'Missing one? <strong>Submit NEW</strong> to add it to Patcher.' }
    ]
  };
  readonly sectionDescriptionByFilter: Record<UserModuleCollectionFilter, string> = {
    MY_MODULES: 'Owned and for-sale modules are available when you build racks and patches.',
    WISHLIST: 'Wanted modules help you keep track of gear you are considering.'
  };

  constructor(
    public backend: SupabaseService,
    public dataService: UserAreaDataService
  ) {
    super();
    this.dataService.updateModulesData$.next();
    
  }
  
}
