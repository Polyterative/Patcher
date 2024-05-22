import {
  Component,
  OnDestroy
}                                  from '@angular/core';
import { Router }                  from '@angular/router';
import {
  fadeInOnEnterAnimation,
  slideInDownOnEnterAnimation
}                                  from 'angular-animations';
import { timer }                   from 'rxjs';
import {
  CardLinkDataModel,
  cleanCardlinkModelObject
}                                  from 'src/app/shared-interproject/components/@smart/list-link-router/clickable-list-card-base';
import { SubManager }              from 'src/app/shared-interproject/directives/subscription-manager';
import { SupabaseService }         from '../../backend/supabase.service';
import { SeoAndUtilsService }      from '../seo-and-utils.service';
import { SeoSocialShareData }      from "ngx-seo";
import { PatchDetailDataService }  from "src/app/components/patch-parts/patch-detail-data.service";
import { ModuleDetailDataService } from "src/app/components/module-parts/module-detail-data.service";
import { take }                    from "rxjs/operators";
import { RackDetailDataService }   from "src/app/components/rack-parts/rack-detail-data.service";
import {
  defaultPatchMinimalViewConfig,
  PatchMinimalViewConfig
}                                  from "src/app/components/patch-parts/patch-minimal/patch-minimal.component";
import {
  defaultRackMinimalViewConfig,
  RackMinimalViewConfig
}                                  from "src/app/components/rack-parts/rack-minimal/rack-minimal.component";
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
}                                  from "src/app/components/module-parts/module-minimal/module-minimal.component";


@Component({
  selector: 'app-home',
  styleUrls: ['./home.component.scss'],
  templateUrl: './home.component.html',
  animations: [
    fadeInOnEnterAnimation({
      anchor: 'titleEnter',
      duration: 2000,
      delay: 200
    }),
    fadeInOnEnterAnimation({
      anchor: 'subtitleEnter',
      duration: 3000,
      delay: 1000
    }),
    slideInDownOnEnterAnimation({
      anchor: 'arrow',
      duration: 1000,
      delay: 5000
    }),
    fadeInOnEnterAnimation({
      anchor: 'rowA',
      duration: 1000,
      delay: 2000
    }),
    fadeInOnEnterAnimation({
      anchor: 'rowB',
      duration: 1000,
      delay: 2500
    }),
    fadeInOnEnterAnimation({
      anchor: 'rowC',
      duration: 1000,
      delay: 3000
    })
  ],
  providers: [
    PatchDetailDataService,
    RackDetailDataService,
    ModuleDetailDataService
  ]
})

export class HomeComponent extends SubManager implements OnDestroy {
  readonly linksData: CardLinkDataModel = {
    ...cleanCardlinkModelObject,
    links: []
  };
  readonly patchViewConfig: PatchMinimalViewConfig = {
    ...defaultPatchMinimalViewConfig,
    hideButtons: true,
  };
  readonly rackViewConfig: RackMinimalViewConfig = {
    ...defaultRackMinimalViewConfig,
  };
  readonly moduleViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hidePanelsOptions: true,
    bigPanelImage: false,
    ellipseDescription: true,
    hideBySameManufacturer: true,
    hidePatchedIn: false,
    hideRackedIn: false
  };
  
  private delayTime = 500;
  
  constructor(
    readonly patchDetailDataService: PatchDetailDataService,
    readonly rackDetailDataService: RackDetailDataService,
    readonly moduleDetailDataService: ModuleDetailDataService,
    readonly backend: SupabaseService,
    private readonly router: Router,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    super();
    
    const seoData: SeoSocialShareData = {
      title: 'Home page',
      description: 'Manager and database for musicians using modular gear, with a focus on saving, and visualizing patch-notes.',
      keywords: 'eurorack, modular, tool, modulargrid, patch-notes, utility, database, doepfer, intellijel, makenoise'
    };
    
    
    this.seoAndUtilsService.updateSeo(seoData, "Home");
    
    //    wait for the user to load the page, then load the data
    timer(this.delayTime * 2)
      .pipe(
        take(1)
      )
      .subscribe(() => {
        //   load the default patch to service
        this.patchDetailDataService.updateSinglePatchData$.next(5);
      });
    
    timer(this.delayTime * 4)
      .pipe(
        take(1)
      )
      .subscribe(() => {
        //   load the default module to service
        this.moduleDetailDataService.updateSingleModuleData$.next(1025);
      });
    
    timer(this.delayTime * 6)
      .pipe(
        take(1)
      )
      .subscribe(() => {
        //   load the default rack to service
        this.rackDetailDataService.updateSingleRackData$.next(265);
      });
    
  }
  
}