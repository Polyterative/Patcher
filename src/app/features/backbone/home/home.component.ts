import {
  Component,
  OnDestroy
}                                  from '@angular/core';
import { Router }                  from '@angular/router';
import {
  BehaviorSubject,
  Subject
}                                  from 'rxjs';
import { SupabaseService }         from 'src/app/features/backend/supabase.service';
import {
  CardLinkDataModel,
  cleanCardlinkModelObject
}                                  from 'src/app/shared-interproject/components/@smart/list-link-router/clickable-list-card-base';
import { ModuleDetailDataService } from '../../../components/module-parts/module-detail-data.service';
import { PatchDetailDataService }  from '../../../components/patch-parts/patch-detail-data.service';
import { RackDetailDataService }   from '../../../components/rack-parts/rack-detail-data.service';

@Component({
  selector:    'app-home',
  styleUrls:   ['./home.component.scss'],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnDestroy {
  iconColor = '#041E50';
  
  destroyEvent$ = new Subject<void>();
  
  readonly linksData: CardLinkDataModel = {
    ...cleanCardlinkModelObject,
    links: []
  };
  
  statistics$ = new BehaviorSubject<Array<number | string>>([
    '...',
    '...',
    '...'
  ]);
  
  constructor(
    public patchDetailDataService: PatchDetailDataService,
    public rackDetailDataService: RackDetailDataService,
    public moduleDetailDataService: ModuleDetailDataService,
    public backend: SupabaseService,
    private router: Router
  ) {
    this.backend.get.statistics()
        .pipe(
        )
        .subscribe(value => {
          this.statistics$.next(value);
        });
  
    this.patchDetailDataService.updateSinglePatchData$.next(5);
    this.rackDetailDataService.updateSingleRackData$.next(7);
    this.moduleDetailDataService.updateSingleModuleData$.next(1025);
  
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
}
