import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import {
  Observable,
  Subject
} from 'rxjs';
import {
  map,
  takeUntil
} from 'rxjs/operators';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { MinimalModule } from 'src/app/models/module';
import { RackDetailDataService } from '../../rack-parts/rack-detail-data.service';
import { ModuleDetailDataService } from '../module-detail-data.service';


@Component({
  selector:        'app-module-minimal',
  templateUrl:     './module-minimal.component.html',
  styleUrls:       ['./module-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleMinimalComponent implements OnInit {
  @Input() data: MinimalModule;
  @Input() viewConfig: ModuleMinimalViewConfig;
  
  isInCollection$: Observable<boolean>;
  
  constructor(
    public userManagerService: UserManagementService,
    public dataService: ModuleDetailDataService,
    public rackDataService: RackDetailDataService
  ) {}
  
  ngOnInit(): void {
    this.isInCollection$ = this.dataService.userModulesList$
                               .pipe(
                                 map(data => data.filter(x => x.id == this.data.id).length > 0),
                                 takeUntil(this.destroyEvent$)
                               );
  }
  
  protected destroyEvent$ = new Subject<void>();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}

export interface ModuleMinimalViewConfig {
  hideLabels: boolean;
  hideManufacturer: boolean;
  hideDescription: boolean;
  hideButtons: boolean;
  hideHP: boolean;
  hideDates: boolean;
  hideTags: boolean;
  hidePanelsOptions: boolean;
  bigPanelImage: boolean;
  ellipseDescription: boolean;
  hidePatchedIn: boolean;
  hideRackedIn: boolean;
  hideBySameManufacturer: boolean;
}

export const defaultModuleMinimalViewConfig: ModuleMinimalViewConfig = {
  hideLabels:         false,
  hideManufacturer:   false,
  hideDescription:    false,
  hideButtons:        false,
  hideHP:             false,
  hideDates:          false,
  hideTags:           false,
  hidePanelsOptions:  true,
  bigPanelImage:      false,
  ellipseDescription: true,
  hidePatchedIn: false,
  hideRackedIn: false,
  hideBySameManufacturer: false
};