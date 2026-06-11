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
    {value: 'ALL', label: 'All', icon: 'view_module'},
    {value: 'HAS', label: 'Owned', icon: 'inventory_2'},
    {value: 'WANTS', label: 'Wanted', icon: 'bookmark_add'},
    {value: 'SELLS', label: 'For sale', icon: 'sell'},
  ];
  readonly emptyStateCopyByFilter: Record<UserModuleCollectionFilter, string> = {
    ALL: 'Add modules to your collection so they are available across your workspace.',
    HAS: 'Add the modules you own here so they are available when you build racks and patches.',
    WANTS: 'Mark modules as wanted from the library to build your wishlist.',
    SELLS: 'Mark modules as for sale from the library to keep track of gear you want to move.'
  };
  readonly sectionDescriptionByFilter: Record<UserModuleCollectionFilter, string> = {
    ALL: 'All modules in your collection, including owned, wanted, and for-sale gear.',
    HAS: 'Owned modules are available when you build racks and patches.',
    WANTS: 'Wanted modules help you keep track of gear you are considering.',
    SELLS: 'For-sale modules help you track gear you want to move.'
  };

  constructor(
    public backend: SupabaseService,
    public dataService: UserAreaDataService
  ) {
    super();
    this.dataService.updateModulesData$.next();
    
  }
  
}
