import {
  Component,
  OnDestroy
}                                  from '@angular/core';
import { Router }                  from '@angular/router';
import {
  fadeInOnEnterAnimation,
  slideInDownOnEnterAnimation
}                                  from 'angular-animations';
import { BehaviorSubject }         from 'rxjs';
import {
  CardLinkDataModel,
  cleanCardlinkModelObject
}                                  from 'src/app/shared-interproject/components/@smart/list-link-router/clickable-list-card-base';
import { ModuleDetailDataService } from '../../../components/module-parts/module-detail-data.service';
import { PatchDetailDataService }  from '../../../components/patch-parts/patch-detail-data.service';
import { RackDetailDataService }   from '../../../components/rack-parts/rack-detail-data.service';
import { SubManager }              from '../../../shared-interproject/directives/subscription-manager';
import { SupabaseService }         from '../../backend/supabase.service';
import { SeoAndUtilsService }      from '../seo-and-utils.service';

@Component({
  selector:    'app-home',
  styleUrls:   ['./home.component.scss'],
  templateUrl: './home.component.html',
  animations:  [
    fadeInOnEnterAnimation({
      anchor:   'titleEnter',
      duration: 2000,
      delay:    200
    }),
    fadeInOnEnterAnimation({
      anchor:   'subtitleEnter',
      duration: 3000,
      delay:    1000
    }),
    slideInDownOnEnterAnimation({
      anchor:   'arrow',
      duration: 1000,
      delay:    5000
    }),
    fadeInOnEnterAnimation({
      anchor:   'rowA',
      duration: 1000,
      delay:    2000
    }),
    fadeInOnEnterAnimation({
      anchor:   'rowB',
      duration: 1000,
      delay:    2500
    }),
    fadeInOnEnterAnimation({
      anchor:   'rowC',
      duration: 1000,
      delay:    3000
    })
  ]
})

export class HomeComponent extends SubManager implements OnDestroy {
  iconColor = '#041E50';
  
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
    readonly patchDetailDataService: PatchDetailDataService,
    readonly rackDetailDataService: RackDetailDataService,
    readonly moduleDetailDataService: ModuleDetailDataService,
    readonly backend: SupabaseService,
    private readonly router: Router,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    super();
    this.patchDetailDataService.updateSinglePatchData$.next(5);
    this.rackDetailDataService.updateSingleRackData$.next(7);
    this.moduleDetailDataService.updateSingleModuleData$.next(1025);
  
    this.backend.get.statistics()
        .pipe(
        )
        .subscribe(value => {
          this.statistics$.next(value);
        });
  
    this.seoAndUtilsService.updateSeo({}, 'Home');
  
  }
  
}
