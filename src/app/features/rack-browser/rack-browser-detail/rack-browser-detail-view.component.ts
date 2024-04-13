import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoSocialShareData } from 'ngx-seo';
import {
  combineLatest,
  Subject
} from 'rxjs';
import {
  filter,
  map,
  take
} from 'rxjs/operators';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from "src/app/components/module-parts/module-minimal/module-minimal.component";


@Component({
  selector: 'app-rack-browser-rack-detail',
  templateUrl: './rack-browser-detail-view.component.html',
  styleUrls: ['./rack-browser-detail-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackBrowserDetailViewComponent implements OnInit {
  @Input() readonly viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig
  };
  
  protected destroyEvent$ = new Subject<void>();
  
  @Input() ignoreSeo = false;
  
  constructor(
    public dataService: RackDetailDataService,
    public route: ActivatedRoute,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
  }
  
  ngOnInit(): void {
    if (!this.ignoreSeo) { this.seoAndUtilsService.updateSeo({}, 'Rack Details'); }
    
    this.route.params
      .pipe(
        map(x => x && x.id && parseInt(x.id) ? parseInt(x.id) : 0),
        filter(x => x > 0),
        take(1)
      )
      .subscribe(data => {
        this.dataService.updateSingleRackData$.next(data);
      });
    
    if (!this.ignoreSeo) {
      combineLatest([
        this.dataService.singleRackData$,
        this.dataService.rowedRackedModules$
      ])
        .pipe(
          filter(x => !!x[0] && !!x[1]),
          take(1)
        )
        .subscribe(([rackData, rowedRackedModules]) => {
          const rowedFlatted = rowedRackedModules.flatMap(x => x);
          
          // remove duplicates
          const uniqueRowedFlatted = [...new Set(rowedFlatted)].map(x => x.module.name);
          
          const joined: string = uniqueRowedFlatted.join(', ');
          
          const seoData: SeoSocialShareData = {
            title: `${ rackData.name } - details. `,
            description: `${ rackData.name } - rack details. Used modules: ${ joined }, for a total of ${ joined.length }.`,
            keywords: `${ joined }, rack, eurorack`,
            
            published: rackData.created,
            modified: rackData.updated
          };
          this.seoAndUtilsService.updateSeo(seoData,
            `${ rackData.name } - Rack Details`);
          
        });
    }
  }
  
  ngOnDestroy(): void {
    this.dataService.singleRackData$.next(undefined);
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
}