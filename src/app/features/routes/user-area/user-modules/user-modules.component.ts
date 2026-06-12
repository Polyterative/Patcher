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
    {value: 'MY_MODULES', label: 'Owned', icon: 'inventory_2'},
    {value: 'WISHLIST', label: 'Wanted', icon: 'bookmark'},
    {value: 'FOR_SALE', label: 'For Sale', icon: 'sell'},
  ];
  readonly emptyStateCopyByFilter: Record<UserModuleCollectionFilter, string> = {
    MY_MODULES: 'Add the modules you own here so they are available when you build racks and patches.',
    WISHLIST: 'Mark modules as wanted from the library to build your wishlist.',
    FOR_SALE: 'Mark modules as for sale from the library to keep track of gear you want to move.'
  };
  readonly emptyStateTipsByFilter: Record<UserModuleCollectionFilter, { icon: string; html: string }[]> = {
    MY_MODULES: [
      { icon: 'add', html: 'Open a module from the library and hit the <strong>+ in the bottom-left</strong> to mark it as owned.' },
      { icon: 'upload', html: 'Missing one? <strong>Submit NEW</strong> to add it to Patcher.' }
    ],
    WISHLIST: [
      { icon: 'add', html: 'Open a module from the library and hit the <strong>+ in the bottom-left</strong> to mark it as wanted.' },
      { icon: 'upload', html: 'Missing one? <strong>Submit NEW</strong> to add it to Patcher.' }
    ],
    FOR_SALE: [
      { icon: 'add', html: 'Open a module from the library and hit the <strong>+ in the bottom-left</strong> to mark it as for sale.' },
      { icon: 'upload', html: 'Missing one? <strong>Submit NEW</strong> to add it to Patcher.' }
    ]
  };
  readonly sectionDescriptionByFilter: Record<UserModuleCollectionFilter, string> = {
    MY_MODULES: 'Owned modules are available when you build racks and patches.',
    WISHLIST: 'Wanted modules help you keep track of gear you are considering.',
    FOR_SALE: 'For-sale modules help you keep track of gear you want to move.'
  };

  constructor(
    public backend: SupabaseService,
    public dataService: UserAreaDataService
  ) {
    super();
    this.dataService.updateModulesData$.next();
    
  }
  
}
