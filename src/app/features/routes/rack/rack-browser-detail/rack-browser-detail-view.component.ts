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
  take,
  takeUntil
} from 'rxjs/operators';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import {
  CommentableEntityTypes,
  CommentsDataService
} from "src/app/components/shared-atoms/comments/comments-data.service";
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from "src/app/components/module-parts/module-minimal/module-minimal.component";


@Component({
  selector: 'app-rack-browser-rack-detail',
  templateUrl: './rack-browser-detail-view.component.html',
  styleUrls: ['./rack-browser-detail-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers:       [CommentsDataService]
  
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
    readonly seoAndUtilsService: SeoAndUtilsService,
    private commentsDataService: CommentsDataService
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
    
    // every time we get the new data for the new module, send the data about the context to the comments service
    this.dataService.singleRackData$
      .pipe(
        filter(x => !!x),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(data => {
        this.commentsDataService.requestCommentsUpdate$.next({entityId: data.id, entityType: CommentableEntityTypes.RACK});
      });
  }
  
  ngOnDestroy(): void {
    this.dataService.singleRackData$.next(undefined);
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
}