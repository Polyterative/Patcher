import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                from '@angular/core';
import { Subject }               from 'rxjs';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { RackMinimal }           from '../../../models/rack';

@Component({
  selector:        'app-rack-minimal',
  templateUrl:     './rack-minimal.component.html',
  styleUrls:       ['./rack-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackMinimalComponent implements OnInit {
  @Input() data: RackMinimal;
  @Input() viewConfig: RackMinimalViewConfig = defaultRackMinimalViewConfig;
  
  // isInCollection$: Observable<boolean>;
  
  constructor(
    public userManagerService: UserManagementService,
    public dataService: RackDetailDataService
  ) {}
  
  ngOnInit(): void {
    // this.isInCollection$ = this.dataService.userRacksList$
    //                            .pipe(
    //                              map(data => data.filter(x => x.id == this.data.id).length > 0),
    //                              takeUntil(this.destroyEvent$)
    //                            );
  }
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}

export interface RackMinimalViewConfig {
  hideLabels: boolean;
  hideDescription: boolean;
  hideButtons: boolean;
  hideHP: boolean;
  hideDates: boolean;
}

export const defaultRackMinimalViewConfig: RackMinimalViewConfig = {
  hideLabels:      false,
  hideDescription: false,
  hideButtons:     false,
  hideHP:          false,
  hideDates:       false
};
