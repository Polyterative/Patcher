import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                   from '@angular/core';
import {
  Observable,
  Subject
}                                   from 'rxjs';
import {
  map,
  takeUntil
}                                   from 'rxjs/operators';
import { MinimalModule }            from '../../../models/models';
import { UserManagementService }    from '../../backbone/login/user-management.service';
import { ModuleBrowserDataService } from '../module-browser-data.service';

@Component({
  selector:        'app-module-browser-module-minimal',
  templateUrl:     './module-browser-module-minimal.component.html',
  styleUrls:       ['./module-browser-module-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleMinimalComponent implements OnInit {
  @Input() data: MinimalModule;
  
  isInCollection$: Observable<boolean>;
  
  constructor(
    public userManagerService: UserManagementService,
    public dataService: ModuleBrowserDataService
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
