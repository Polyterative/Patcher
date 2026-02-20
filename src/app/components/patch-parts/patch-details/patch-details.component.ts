import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { Patch } from 'src/app/models/patch';


@Component({
  selector: 'app-patch-details',
  templateUrl: './patch-details.component.html',
  styleUrls: ['./patch-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInOnEnterAnimation({
      anchor: 'enter',
      duration: 1525,
      animateChildren: 'after'
    })
  ],
  standalone: false
})
export class PatchDetailsComponent implements OnInit {
  @Input() data: Patch;
  @Input() isEditing: boolean = false;
  
  switches = [];
  
  constructor(
    public backend: SupabaseService,
    public dataService: PatchDetailDataService
    // userManagerService: UserManagementService
  ) { }
  
  ngOnInit(): void {
  
  }
  
}