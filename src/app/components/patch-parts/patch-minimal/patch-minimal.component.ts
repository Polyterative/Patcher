import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                 from '@angular/core';
import { Subject }                from 'rxjs';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { UserManagementService }  from 'src/app/features/backbone/login/user-management.service';
import { UrlCreatorService }      from 'src/app/features/backend/url-creator.service';
import { PatchMinimal }           from 'src/app/models/models';

@Component({
  selector:        'app-patch-minimal',
  templateUrl:     './patch-minimal.component.html',
  styleUrls:       ['./patch-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchMinimalComponent implements OnInit {
  @Input() data: PatchMinimal;
  @Input() viewConfig: PatchMinimalViewConfig = defaultPatchMinimalViewConfig;
  
  // isInCollection$: Observable<boolean>;
  
  constructor(
    public userManagerService: UserManagementService,
    public dataService: PatchDetailDataService,
    public urlCreatorService: UrlCreatorService
  ) {}
  
  ngOnInit(): void {
  
    // this.isInCollection$ = this.dataService.userPatchsList$
    //                            .pipe(
    //                              map(data => data.filter(x => x.id == this.data.id).length > 0),
    //                              takeUntil(this.destroyEvent$)
    //                            );
  }
  
  protected destroyEvent$ = new Subject<void>();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
  
}


export interface PatchMinimalViewConfig {
  hideLabels: boolean;
  hideManufacturer: boolean;
  hideDescription: boolean;
  hideButtons: boolean;
  hideHP: boolean;
  hideDates: boolean;
}

export const defaultPatchMinimalViewConfig: PatchMinimalViewConfig = {
  hideLabels:       false,
  hideManufacturer: false,
  hideDescription:  false,
  hideButtons:      false,
  hideHP:           false,
  hideDates:        false
};
