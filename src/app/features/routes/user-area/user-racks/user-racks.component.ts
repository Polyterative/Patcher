import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatDialog } from "@angular/material/dialog";
import {
  defaultRackMinimalViewConfig,
  RackMinimalViewConfig
} from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';


@Component({
  selector: 'app-user-racks',
  templateUrl: './user-racks.component.html',
  styleUrls: ['./user-racks.component.scss'],
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({opacity: 0}),
        animate('225ms {{ delay }}ms ease', style({opacity: 1}))
      ], { params: { delay: 0 } })
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class UserRacksComponent {
  rackMinimalViewConfig: RackMinimalViewConfig = {...defaultRackMinimalViewConfig};
  @Input() globalSearchQuery = '';
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService,
    public dataService: UserAreaDataService,
  ) {
    
    // update with local user data
    this.dataService.updateRackData$.next(undefined);
  }
  
}
