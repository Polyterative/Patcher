import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                 from '@angular/core';
import { of }                     from 'rxjs/internal/observable/of';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { SupabaseService }        from 'src/app/features/backend/supabase.service';
import { Patch }                  from 'src/app/models/models';

@Component({
  selector:        'app-patch-details',
  templateUrl:     './patch-details.component.html',
  styleUrls:       ['./patch-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchDetailsComponent implements OnInit {
  @Input() data: Patch;
  
  switches = [];
  
  constructor(
    public backend: SupabaseService,
    public dataService: PatchDetailDataService
    // userManagerService: UserManagementService
  ) { }
  
  ngOnInit(): void {
    of('a')
      .subscribe(value => {
        this.dataService.patchEditingPanelOpenState$.next(true);
      
      });
  
  }
  
}
