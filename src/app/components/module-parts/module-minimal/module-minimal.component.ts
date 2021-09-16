import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                  from '@angular/core';
import {
  Observable,
  Subject
}                                  from 'rxjs';
import {
  map,
  takeUntil
}                                  from 'rxjs/operators';
import { UserManagementService }   from 'src/app/features/backbone/login/user-management.service';
import { MinimalModule }           from 'src/app/models/models';
import { ModuleDetailDataService } from '../module-detail-data.service';

export interface ModuleMinimalViewConfig {
  hideLabels: boolean;
  hideManufacturer: boolean;
  hideDescription: boolean;
  hideButtons: boolean;
  hideHP: boolean;
  hideDates: boolean;
}

export const defaultModuleMinimalViewConfig: ModuleMinimalViewConfig = {
  hideLabels:       false,
  hideManufacturer: false,
  hideDescription:  false,
  hideButtons:      false,
  hideHP:           false,
  hideDates:        false
  
};

@Component({
  selector:        'app-module-minimal',
  templateUrl:     './module-minimal.component.html',
  styleUrls:       ['./module-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleMinimalComponent implements OnInit {
  @Input() data: MinimalModule;
  
  @Input() viewConfig: ModuleMinimalViewConfig = defaultModuleMinimalViewConfig;
  
  isInCollection$: Observable<boolean>;
  
  constructor(
    public userManagerService: UserManagementService,
    public dataService: ModuleDetailDataService
  ) {}
  
  ngOnInit(): void {
    this.isInCollection$ = this.dataService.userModulesList$
                               .pipe(
                                 map(data => data.filter(x => x.id == this.data.id).length > 0),
                                 takeUntil(this.destroyEvent$)
                               );
  }
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
