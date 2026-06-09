import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatDialog } from "@angular/material/dialog";
import { PatchMinimal } from 'src/app/models/patch';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';


@Component({
  selector: 'app-user-patches',
  templateUrl: './user-patches.component.html',
  styleUrls: ['./user-patches.component.scss'],
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
export class UserPatchesComponent {
  @Input() globalSearchQuery = '';
  
  constructor(
    public dialog: MatDialog,
    public backend: SupabaseService,
    public dataService: UserAreaDataService,
  ) {
    this.dataService.updatePatchesData$.next();
   
  }

}
