import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import {
  defaultRackMinimalViewConfig,
  RackMinimalViewConfig
} from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from '../user-area-data.service';


@Component({
  selector:        'app-user-racks',
  templateUrl:     './user-racks.component.html',
  styleUrls:       ['./user-racks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserRacksComponent {
  rackMinimalViewConfig: RackMinimalViewConfig = {...defaultRackMinimalViewConfig};
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService,
    public dataService: UserAreaDataService
  ) {
    
    // update with local user data
    this.dataService.updateRackData$.next(undefined);
  }
  
}