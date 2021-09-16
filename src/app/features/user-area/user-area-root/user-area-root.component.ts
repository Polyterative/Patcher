import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                  from '@angular/core';
import { UserManagementService }   from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService }         from 'src/app/features/backend/supabase.service';
import { ModuleMinimalViewConfig } from '../../../components/module-parts/module-minimal/module-minimal.component';

@Component({
  selector:        'app-user-area-root',
  templateUrl:     './user-area-root.component.html',
  styleUrls:       ['./user-area-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserAreaRootComponent implements OnInit {
  @Input() viewConfig: ModuleMinimalViewConfig = {
    hideLabels:       false,
    hideManufacturer: false,
    hideDescription:  false,
    hideButtons:      true,
    hideHP:           false,
    hideDates:        true
  };
  
  constructor(
    public userService: UserManagementService,
    public backend: SupabaseService
  ) { }
  
  ngOnInit(): void {
  }
  
}
