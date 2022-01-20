import {
  ChangeDetectionStrategy,
  Component
}                              from '@angular/core';
import { MatDialog }           from '@angular/material/dialog';
import { SupabaseService }     from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from '../user-area-data.service';

@Component({
  selector:        'app-user-patches',
  templateUrl:     './user-patches.component.html',
  styleUrls:       ['./user-patches.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserPatchesComponent {
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService,
    public dataService: UserAreaDataService
  ) {
    this.dataService.updatePatchesData$.next();
  
  }
}
