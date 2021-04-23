import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                from '@angular/core';
import { Subject }               from 'rxjs';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { RackMinimal }           from 'src/app/models/models';

@Component({
  selector:        'app-rack-minimal',
  templateUrl:     './rack-minimal.component.html',
  styleUrls:       ['./rack-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackMinimalComponent implements OnInit {
  @Input() data: RackMinimal;
  
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
