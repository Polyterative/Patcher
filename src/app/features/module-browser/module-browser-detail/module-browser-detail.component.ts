import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                  from '@angular/core';
import { ActivatedRoute }          from '@angular/router';
import { SeoSocialShareData }      from 'ngx-seo';
import { Subject }                 from 'rxjs';
import {
  filter,
  map,
  take
}                                  from 'rxjs/operators';
import { ModuleDetailDataService } from 'src/app/components/module-parts/module-detail-data.service';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
}                                  from '../../../components/module-parts/module-minimal/module-minimal.component';
import { SeoAndUtilsService }      from '../../backbone/seo-and-utils.service';

@Component({
  selector:        'app-module-browser-detail',
  templateUrl:     './module-browser-detail.component.html',
  styleUrls:       ['./module-browser-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserDetailComponent implements OnInit {
  
  protected destroyEvent$ = new Subject<void>();
  @Input() ignoreSeo = false;
  @Input() viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    ellipseDescription: false,
    bigPanelImage:      true,
    hidePanelsOptions:  false
  };
  
  @Input() bySameManufacturerViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    ellipseDescription: true,
    hideButtons:        true,
    hideDates:          true,
    hideManufacturer:   true,
    hideLabels:         true,
    hideDescription:    true
  };
  
  constructor(
    public dataService: ModuleDetailDataService,
    public route: ActivatedRoute,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    
  }
  
  ngOnInit(): void {
    if (!this.ignoreSeo) { this.seoAndUtilsService.updateSeo({}, 'Module Details'); }
    
    this.route.params
        .pipe(
          map(x => x && x.id && parseInt(x.id) ? parseInt(x.id) : 0),
          filter(x => x > 0)
          // take(1)
        )
        .subscribe(data => {
          // debugger
          this.dataService.updateSingleModuleData$.next(data);
        });
    
    if (!this.ignoreSeo) {
      this.dataService.singleModuleData$
          .pipe(
            filter(x => !!x),
            take(1)
          )
          .subscribe(data => {
            const tags: string = data.tags.map(x => x.tag.name)
                                     .join(', ');
            const seoData: SeoSocialShareData = {
              title:       `${ data.name } - details. `,
              description: `${ data.name } - module details.
                Has ${ data.ins.length } inputs and ${ data.outs.length } outputs.
                Made by ${ data.manufacturer.name }.
                Module is ${ data.hp } HP wide.
                Tagged ${ tags }.
                `,
              keywords:    `${ tags }, module, eurorack,${ data.manufacturer.name },${ data.ins.map(x => x.name)
                                                                                           .join(', ') }, ${ data.outs.map(x => x.name)
                                                                                                                 .join(', ') }`,
              published:   data.created,
              modified:    data.updated
            };
            this.seoAndUtilsService.updateSeo(seoData,
              `${ data.name } by ${ data.manufacturer.name } - Module Details`);
          });
    }
    
  }
  
  ngOnDestroy(): void {
    this.dataService.singleModuleData$.next(undefined);
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
}
