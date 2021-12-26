import { moveItemInArray }         from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                  from '@angular/core';
import { MatSnackBar }             from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  Subject
}                                  from 'rxjs';
import { withLatestFrom }          from 'rxjs/operators';
import { SupabaseService }         from 'src/app/features/backend/supabase.service';
import {
  DbModule,
  RackMinimal
}                                  from 'src/app/models/models';
import { SubManager }              from '../../../shared-interproject/directives/subscription-manager';
import { ModuleMinimalViewConfig } from '../../module-parts/module-minimal/module-minimal.component';
import { RackDetailDataService }   from '../rack-detail-data.service';

@Component({
  selector:        'app-rack-details',
  templateUrl:     './rack-details.component.html',
  styleUrls:       ['./rack-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackDetailsComponent extends SubManager implements OnInit {
  @Input() data: RackMinimal;
  rackModules$ = new BehaviorSubject<DbModule[]>([]);
  
  
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public dataService: RackDetailDataService
    // userManagerService: UserManagementService
  ) { super(); }
  
  
  protected destroyEvent$ = new Subject<void>();
  viewConfig: ModuleMinimalViewConfig = {
    hideLabels:       true,
    hideManufacturer: false,
    hideDescription:  false,
    hideButtons:      true,
    hideHP:           false,
    hideDates:        true
  };
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
  ngOnInit(): void {
    this.manageSub(
      this.backend.get.rackModules(this.data.id)
          .subscribe(x => {
            this.rackModules$.next(x);
          })
    );
    
    
    this.manageSub(
      this.dataService.rackOrderChange$
          .pipe(
            withLatestFrom(this.rackModules$)
          )
          .subscribe(([event, rackModules]) => {
            moveItemInArray(rackModules, event.previousIndex, event.currentIndex);
        
            this.rackModules$.next(rackModules);
        
            // this.backend.
          })
    );
    
    
  }
  
}
