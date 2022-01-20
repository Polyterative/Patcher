import {
  ChangeDetectionStrategy,
  Component
}                              from '@angular/core';
import { MatDialog }           from '@angular/material/dialog';
import { SupabaseService }     from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from '../user-area-data.service';

@Component({
  selector:        'app-user-racks',
  templateUrl:     './user-racks.component.html',
  styleUrls:       ['./user-racks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserRacksComponent {
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService,
    public dataService: UserAreaDataService
  ) {
    
    // update with local user data
    this.dataService.updateRackData$.next(undefined);
  }
  
}
