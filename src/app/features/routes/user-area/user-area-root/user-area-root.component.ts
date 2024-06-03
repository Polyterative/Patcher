import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';


@Component({
  selector:        'app-user-area-root',
  templateUrl:     './user-area-root.component.html',
  styleUrls:       ['./user-area-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserAreaRootComponent implements OnInit {
  @Input() viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideLabels:       false,
    hideManufacturer: false,
    hideDescription:  false,
    hideButtons:      true,
    hideHP:           false,
    hideDates:        true,
    hideTags:         true
  };
  
  @Input() ignoreSeo = false;
  
  constructor(
    public userService: UserManagementService,
    public backend: SupabaseService,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) { }
  
  ngOnInit(): void {
    //TODO: change this when user can see other profiles
    if (!this.ignoreSeo) {
      this.seoAndUtilsService.updateSeo({
        title:       'User collection',
        description: 'Personal user collection'
      }, 'My collection');
    }
    
  }
  
}