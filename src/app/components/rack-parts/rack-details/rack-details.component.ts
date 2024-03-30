import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { RackMinimal } from 'src/app/models/rack';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { RackDetailDataService } from '../rack-detail-data.service';


@Component({
  selector:        'app-rack-details',
  templateUrl:     './rack-details.component.html',
  styleUrls:       ['./rack-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackDetailsComponent extends SubManager implements OnInit {
  @Input() data: RackMinimal;
  
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public dataService: RackDetailDataService
    // userManagerService: UserManagementService
  ) { super(); }
  
  
  ngOnInit(): void {
  
  }
  
  
}