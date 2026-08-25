import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import { combineLatest } from 'rxjs';
import {
  filter,
  map,
  take
} from 'rxjs/operators';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { CommentsDataService } from 'src/app/components/shared-atoms/comments/comments-data.service';
import { CommentableEntityTypes } from 'src/app/models/comment';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  clearJsonLdScript,
  upsertJsonLdScript
} from 'src/app/shared-interproject/json-ld-dom';
import { RackMinimal } from 'src/app/models/rack';
import { RackedModule } from 'src/app/models/module';
import { EntityStatItem } from 'src/app/components/shared-atoms/entity-stat-grid/entity-stat-grid.component';
import { isBlankModule } from 'src/app/components/rack-parts/rack-blank-module.constants';
import { EntityStatGroup } from 'src/app/components/shared-atoms/entity-stat-card/entity-stat-card.component';
import {
  buildRackPowerBreakdown,
  formatPowerRailValue
} from 'src/app/components/rack-parts/rack-power-breakdown.utils';
import { environment } from 'src/environments/environment';


const JSONLD_SCRIPT_ID = 'rack-jsonld';

@Component({
  selector: 'app-rack-browser-rack-detail',
  templateUrl: './rack-browser-detail-view.component.html',
  styleUrls: ['./rack-browser-detail-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CommentsDataService, UserAreaDataService],
  standalone: false
})
export class RackBrowserDetailViewComponent extends SubManager implements OnInit {
  @Input() readonly viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    tagsShowCounts: false
  };
  @Input() ignoreSeo = false;
  readonly coolReactionsEnabled = environment.features.coolReactionsEnabled;

  constructor(
    public dataService: RackDetailDataService,
    public userAreaDataService: UserAreaDataService,
    public route: ActivatedRoute,
    readonly seoAndUtilsService: SeoAndUtilsService,
    private commentsDataService: CommentsDataService,
    private userManagementService: UserManagementService
  ) {
    super();
  }

  ngOnInit(): void {
    if (!this.ignoreSeo) { this.seoAndUtilsService.updateSeo({}, 'Rack Details'); }

    const publicId$ = this.route.params.pipe(
      map(x => (x && typeof x.publicId === 'string' && x.publicId.length > 0) ? x.publicId : ''),
      filter(x => !!x),
      take(1)
    );

    // Load the rack's own data as soon as the route resolves — independent of auth
    // state. During SSR, `loggedUser$` can take longer to settle than the render
    // window lasts (or, for a truly anonymous visitor, never resolve to a truthy
    // value at all), so gating this on it — as `combineLatest` did before — left
    // every anonymous/crawler request with no rack data at all.
    publicId$.subscribe(publicId => this.dataService.updateSingleRackByPublicId$.next(publicId));

    // Auth-dependent UI/API side effects only — must not block the data load above.
    this.userManagementService.loggedUser$.pipe(take(1)).subscribe(user => {
      this.dataService.setPublicDetailMode(!user);
      if (user) {
        this.userAreaDataService.updateModulesData$.next();
      }
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
            modified: rackData.updated,
            ...(rackData.image ? {image: rackData.image} : {})
          };
          this.seoAndUtilsService.updateSeo(seoData, `${ rackData.name } - Rack Details`);
          this.injectRackJsonLd(rackData!, uniqueRowedFlatted);
        });
    }
    
    // every time we get new data for the rack, update the comments context
    this.dataService.singleRackData$
      .pipe(
        filter(x => !!x),
        this.takeUntilDestroyed()
      )
      .subscribe(data => {
        this.commentsDataService.requestCommentsUpdate$.next({
          entityId: data.id,
          entityType: CommentableEntityTypes.RACK
        });
      });
  }
  
  override ngOnDestroy(): void {
    this.dataService.setPublicDetailMode(false);
    clearJsonLdScript(JSONLD_SCRIPT_ID);
    this.dataService.singleRackData$.next(undefined);
    super.ngOnDestroy();
  }

  calculateRackUtilization(totalHp: number, rows: number, usedHp: number): string {
    const totalAvailableHp = totalHp * rows;
    if (totalAvailableHp === 0) {
      return '0%';
    }

    return `${ ((usedHp / totalAvailableHp) * 100).toFixed(1) }%`;
  }

  rackSummaryStatRows(data: RackMinimal, rowedRackedModules: RackedModule[][]): EntityStatGroup[][] {
    const rackModules = rowedRackedModules.flat().filter(module => !isBlankModule(module.module.id));
    const totalModules = rackModules.length;
    const usedHp = rackModules.reduce((sum, module) => sum + module.module.hp, 0);
    const remainingHp = data.hp * data.rows - usedHp;
    const powerBreakdown = buildRackPowerBreakdown(rowedRackedModules);
    const [maxDepth, minDepth, averageDepth] = this.totalDepth(rowedRackedModules);
    const totalWeightKg = this.totalWeight(rowedRackedModules) / 1000;
    const missingPowerSuffix = this.missingPowerSuffix(powerBreakdown.missingPowerDataCount);

    return [
      [
        {
          title: 'Rack',
          items: [
            { label: 'Rows', value: data.rows.toString(), icon: 'view_comfy' },
            { label: 'Modules', value: totalModules.toString(), icon: 'widgets' },
            { label: 'HP per row', value: data.hp.toString(), icon: 'straighten' }
          ]
        },
        {
          title: 'Space',
          items: [
            { label: 'HP used', value: usedHp.toString(), icon: 'crop_5_4' },
            { label: 'HP available', value: remainingHp.toString(), icon: 'crop_free' },
            { label: 'Rack utilization', value: this.calculateRackUtilization(data.hp, data.rows, usedHp), icon: 'bar_chart' }
          ]
        }
      ],
      [
        {
          title: 'Power',
          items: [
            { label: '+12V', labelSuffix: missingPowerSuffix, value: formatPowerRailValue(powerBreakdown.powerPos12), icon: 'bolt' },
            { label: '-12V', labelSuffix: missingPowerSuffix, value: formatPowerRailValue(powerBreakdown.powerNeg12), icon: 'bolt' },
            { label: '+5V', labelSuffix: missingPowerSuffix, value: formatPowerRailValue(powerBreakdown.powerPos5), icon: 'bolt' },
            {
              label: 'Power headers',
              value: powerBreakdown.powerHeaderCount.toString(),
              icon: 'power',
              detail: this.powerHeaderDetail(powerBreakdown.passiveModuleCount, powerBreakdown.unknownPowerModuleCount)
            }
          ]
        },
        {
          title: 'Physical',
          items: [
            { label: 'Max depth', value: `${ maxDepth.toPrecision(2) } mm`, icon: 'vertical_align_bottom' },
            { label: 'Min depth', value: `${ minDepth.toPrecision(2) } mm`, icon: 'vertical_align_top' },
            { label: 'Average depth', value: `${ averageDepth.toPrecision(2) } mm`, icon: 'vertical_align_center' },
            { label: 'Modules weight', value: `${ totalWeightKg.toPrecision(2) } kg`, icon: 'fitness_center' }
          ]
        }
      ]
    ];
  }

  private missingPowerSuffix(count: number): string | undefined {
    return count > 0 ? `(${ count } missing)` : undefined;
  }

  private powerHeaderDetail(passiveCount: number, unknownCount: number): string | undefined {
    const parts = [
      passiveCount > 0 ? `${ passiveCount } passive` : '',
      unknownCount > 0 ? `${ unknownCount } unknown` : '',
    ].filter(Boolean);

    return parts.length ? parts.join(' · ') : undefined;
  }

  private injectRackJsonLd(rackData: RackMinimal, modules: string[]): void {
    clearJsonLdScript(JSONLD_SCRIPT_ID);
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
      'url': `https://patcher.xyz/racks/${ rackData.public_id ?? rackData.id }`,
      'keywords': modules.length ? modules.join(', ') : undefined,
    };
    Object.keys(jsonLd).forEach(k => jsonLd[k] === undefined && delete jsonLd[k]);
    upsertJsonLdScript(JSONLD_SCRIPT_ID, jsonLd);
  }

  private totalDepth(rowedRackedModules: RackedModule[][]): [number, number, number] {
    const depths = rowedRackedModules
      .flat()
      .filter(module => !isBlankModule(module.module.id))
      .map(module => module.module.depth)
      .filter((depth): depth is number => depth != null);

    if (depths.length === 0) {
      return [0, 0, 0];
    }

    const maxDepth = Math.max(...depths);
    const minDepth = Math.min(...depths);
    const averageDepth = depths.reduce((sum, depth) => sum + depth, 0) / depths.length;
    return [maxDepth, minDepth, averageDepth];
  }

  private totalWeight(rowedRackedModules: RackedModule[][]): number {
    return rowedRackedModules
      .flat()
      .filter(module => !isBlankModule(module.module.id))
      .map(module => module.module.weight)
      .filter((weight): weight is number => weight != null)
      .reduce((sum, weight) => sum + weight, 0);
  }
}
