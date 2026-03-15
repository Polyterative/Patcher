import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { AdminFlagsDataService } from './admin-flags-data.service';


@Component({
  selector:        'app-admin-flags',
  templateUrl:     './admin-flags.component.html',
  styleUrls:       ['./admin-flags.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone:      false,
  providers:       [AdminFlagsDataService]
})
export class AdminFlagsComponent {
  constructor(
    public dataService: AdminFlagsDataService,
    public backend: SupabaseService,
    public snackBar: MatSnackBar
  ) {}
}
