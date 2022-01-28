import {
  Component,
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
import { SeoAndUtilsService }      from '../../backbone/seo-and-utils.service';

@Component({
  selector:    'app-module-browser-module-detail-view-root',
  templateUrl: './module-browser-module-detail-view-root.component.html',
  styleUrls:   ['./module-browser-module-detail-view-root.component.scss']
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModuleBrowserModuleDetailViewRootComponent implements OnInit {
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public dataService: ModuleDetailDataService,
    public route: ActivatedRoute,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
  
    seoAndUtilsService.updateSeo({}, 'Module Details');
  
  }
  
  ngOnInit(): void {
  
    this.route.params
        .pipe(
          map(x => x && x.id && parseInt(x.id) ? parseInt(x.id) : 0),
          filter(x => x > 0),
          take(1)
        )
        .subscribe(data => {
          // debugger
          this.dataService.updateSingleModuleData$.next(data);
        });
  
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
  
  ngOnDestroy(): void {
    this.dataService.singleModuleData$.next(undefined);
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
}
