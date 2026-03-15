import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import { combineLatest } from 'rxjs';
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
} from 'src/app/components/shared-atoms/comments/comments-data.service';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


const JSONLD_SCRIPT_ID = 'rack-jsonld';

@Component({
  selector: 'app-rack-browser-rack-detail',
  templateUrl: './rack-browser-detail-view.component.html',
  styleUrls: ['./rack-browser-detail-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CommentsDataService],
  standalone: false
})
export class RackBrowserDetailViewComponent extends SubManager implements OnInit {
  @Input() readonly viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    tagsShowCounts: false
  };
  @Input() ignoreSeo = false;

  constructor(
    public dataService: RackDetailDataService,
    public route: ActivatedRoute,
    readonly seoAndUtilsService: SeoAndUtilsService,
    private commentsDataService: CommentsDataService
  ) {
    super();
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
          const uniqueRowedFlatted = [...new Set(rowedFlatted)].map(x => x.module.name);
          const joined = uniqueRowedFlatted.join(', ');
          
          const descParts: string[] = [];
          if (rackData.description) { descParts.push(rackData.description.trim()); }
          descParts.push(`Eurorack rack by ${ rackData.author?.username || 'unknown' } — ${ rackData.rows } row${ rackData.rows !== 1 ? 's' : '' }, ${ rackData.hp } HP.`);
          if (uniqueRowedFlatted.length) {
            descParts.push(`Contains ${ uniqueRowedFlatted.length } module${ uniqueRowedFlatted.length !== 1 ? 's' : '' }: ${ joined }.`);
          }

          const seoData: SeoSocialShareData = {
            title: `${ rackData.name } - details. `,
            description: descParts.join(' '),
            keywords: `${ joined }, rack, eurorack`,
            published: rackData.created,
            modified: rackData.updated
          };
          this.seoAndUtilsService.updateSeo(seoData, `${ rackData.name } - Rack Details`);
          this.injectRackJsonLd(rackData, uniqueRowedFlatted);
        });
    }
    
    // every time we get new data for the rack, update the comments context
    this.dataService.singleRackData$
      .pipe(
        filter(x => !!x),
        takeUntil(this.destroy$)
      )
      .subscribe(data => {
        this.commentsDataService.requestCommentsUpdate$.next({
          entityId: data.id,
          entityType: CommentableEntityTypes.RACK
        });
      });
  }
  
  override ngOnDestroy(): void {
    document.getElementById(JSONLD_SCRIPT_ID)?.remove();
    this.dataService.singleRackData$.next(undefined);
    super.ngOnDestroy();
  }

  private injectRackJsonLd(rackData: any, modules: string[]): void {
    document.getElementById(JSONLD_SCRIPT_ID)?.remove();
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      'name': rackData.name ?? undefined,
      'description': rackData.description ?? undefined,
      'author': rackData.author?.username
        ? {'@type': 'Person', 'name': rackData.author.username}
        : undefined,
      'dateCreated': rackData.created ?? undefined,
      'dateModified': rackData.updated ?? undefined,
      'url': `https://patcher.xyz/racks/details/${ rackData.id }`,
      'keywords': modules.length ? modules.join(', ') : undefined,
    };
    Object.keys(jsonLd).forEach(k => jsonLd[k] === undefined && delete jsonLd[k]);
    const script = document.createElement('script');
    script.id = JSONLD_SCRIPT_ID;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }
}