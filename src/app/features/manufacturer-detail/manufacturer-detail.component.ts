import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  combineLatest,
  Observable
} from 'rxjs';
import {
  filter,
  map
} from 'rxjs/operators';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import {
  ManufacturerDetail,
  ManufacturerDetailDataService
} from 'src/app/features/manufacturer-detail/manufacturer-detail-data.service';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { LabelValueData } from 'src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component';
import { MinimalModule } from 'src/app/models/module';
import { ModuleList } from 'src/app/features/module-browser/module-browser-data.service';
import { TimeagoPipe } from 'ngx-timeago';
import {
  normalizeManufacturerAnalyticsRows,
  DEFAULT_MANUFACTURER_ANALYTICS_PRIVACY_THRESHOLD,
  MANUFACTURER_ANALYTICS_HIDDEN_COPY,
  ManufacturerAnalyticsDisplayRow
} from 'src/app/features/manufacturer-detail/manufacturer-analytics.utils';
import {
  normalizeFeaturedModuleIds,
  MANUFACTURER_FEATURED_MODULE_LIMIT
} from 'src/app/features/manufacturer-detail/manufacturer-updates.utils';
import {
  serializeManufacturerWidgetModuleCard,
  buildManufacturerWidgetEmbedSnippet,
  ManufacturerWidgetModuleCardContract
} from 'src/app/features/manufacturer-detail/manufacturer-widget-contract.utils';
import {
  clearJsonLdScript,
  upsertJsonLdScript
} from 'src/app/shared-interproject/json-ld-dom';
import { normalizeSupabaseUtcTimestamp } from 'src/app/shared-interproject/pipes/supabase-utc-timestamp.pipe';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { environment } from 'src/environments/environment';


const JSONLD_SCRIPT_ID = 'manufacturer-jsonld';

@Component({
  selector: 'app-manufacturer-detail',
  templateUrl: './manufacturer-detail.component.html',
  styleUrls: ['./manufacturer-detail.component.scss'],
  providers: [ManufacturerDetailDataService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ManufacturerDetailComponent extends SubManager {

  readonly moduleViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    ellipseDescription: true,
    hideButtons: false,
    hideDates: true,
    hideManufacturer: true,
    hideLabels: false,
    hideDescription: false,
    tagsShowCounts: false,
    tagsReadOnly: true,
    tagsMaxCount: 5,
    hidePatchedIn: true,
    hideRackedIn: true,
    hideBySameManufacturer: true,
    highlightDescriptionKeywords: true,
  };
  
  stats$: Observable<LabelValueData[]>;
  /** Display-only featured surface: first public catalogue modules, capped. No persistence. */
  featuredModules$: Observable<MinimalModule[]>;
  /** Privacy-safe aggregate analytics rows (threshold-gated, display copy only). */
  analyticsRows$: Observable<readonly ManufacturerAnalyticsDisplayRow[]>;
  /** Widget embed preview contract for the first public module (null when none). */
  widgetCard$: Observable<ManufacturerWidgetModuleCardContract | null>;
  /** Copyable display-only embed snippet derived from the preview contract (null when none, no endpoint). */
  widgetEmbedSnippet$: Observable<string | null>;

  /** Gates the unreleased Featured / Activity / Widget embed preview sections (off in production). */
  manufacturerInsightsEnabled = environment.features.manufacturerInsightsEnabled;

  readonly analyticsPrivacyThreshold = DEFAULT_MANUFACTURER_ANALYTICS_PRIVACY_THRESHOLD;
  readonly analyticsEmptyCopy = MANUFACTURER_ANALYTICS_HIDDEN_COPY;
  readonly featuredModuleLimit = MANUFACTURER_FEATURED_MODULE_LIMIT;

  constructor(
    public readonly dataService: ManufacturerDetailDataService,
    private readonly route: ActivatedRoute,
    private readonly seoAndUtilsService: SeoAndUtilsService,
    private readonly timeago: TimeagoPipe,
    private readonly urlCreatorService: UrlCreatorService
  ) {
    super();
    
    this.stats$ = combineLatest([
      this.dataService.manufacturerData$,
      this.dataService.modulesData$
    ]).pipe(
      map(([manufacturer, modules]): LabelValueData[] => {
        if (!manufacturer) return [];
        const count = modules?.length ?? 0;
        const oneU = modules ? modules.filter(m => m.standard.id === 1 || m.standard.id === 2).length : 0;
        const threeU = modules ? modules.filter(m => m.standard.id === 0).length : 0;
        const totalHp = modules ? modules.reduce((s, m) => s + m.hp, 0) : 0;
        const avgHp = count > 0 ? (totalHp / count).toFixed(1) : '—';
        
        const lastUpdated = manufacturer.latestModuleUpdatedAt
          ? this.timeago.transform(normalizeSupabaseUtcTimestamp(manufacturer.latestModuleUpdatedAt)) as string
          : null;
        
        const changed = manufacturer.changedModulesLast30Days ?? 0;
        
        return [
          {label: 'In catalogue', value: count.toString(), icon: 'format_list_numbered'},
          {label: 'Active this month', value: changed.toString(), icon: 'trending_up', hidden: changed === 0},
          {label: 'Last updated', value: lastUpdated ?? '—', icon: 'schedule', hidden: !lastUpdated},
          {label: 'Average HP', value: avgHp, icon: 'straighten', hidden: count === 0},
          {label: '3U', value: threeU.toString(), icon: 'crop_din', hidden: threeU === 0},
          {label: '1U', value: oneU.toString(), icon: 'crop_landscape', hidden: oneU === 0},
        ];
      })
    );

    this.featuredModules$ = this.dataService.modulesData$.pipe(
      map((modules): MinimalModule[] => {
        if (!modules || modules.length === 0) return [];
        const byId = new Map(modules.map(m => [String(m.id), m]));
        const orderedIds = normalizeFeaturedModuleIds(
          modules.filter(m => m.public !== false).map(m => String(m.id))
        );
        return orderedIds
          .map(id => byId.get(id))
          .filter((m): m is MinimalModule => !!m);
      })
    );

    // Threshold reconciliation: backend per-metric thresholds are 3/5/10
    // (see MANUFACTURER_ANALYTICS_THRESHOLDS in supabase-queries.manufacturer-stats.ts
    // and the unified-rule proposal on MANUFACTURER_ANALYTICS_PRIVACY_THRESHOLDS_BY_METRIC).
    // This slice keeps the flat-3 display floor until product/backend approve hiding
    // currently-visible 3-9 views / 3-4 outbound/collection rows, so no per-metric
    // override is passed here. Display-only seam: no backend fetch added.
    this.analyticsRows$ = this.dataService.displayAggregateRows$.pipe(
      map(rows => normalizeManufacturerAnalyticsRows(rows))
    );

    this.widgetCard$ = combineLatest([
      this.dataService.manufacturerData$,
      this.dataService.modulesData$
    ]).pipe(
      map(([manufacturer, modules]) => {
        if (!manufacturer) return null;
        const firstPublic = (modules ?? []).find(m => m.public !== false) ?? null;
        if (!firstPublic) return null;
        return serializeManufacturerWidgetModuleCard(manufacturer, firstPublic);
      })
    );

    this.widgetEmbedSnippet$ = this.widgetCard$.pipe(
      map(card => buildManufacturerWidgetEmbedSnippet(card))
    );


    this.seoAndUtilsService.updateSeo({}, 'Manufacturer');

    this.route.params.pipe(
      map(params => params && params['id'] ? parseInt(params['id'], 10) : 0),
      filter(id => id > 0),
      this.takeUntilDestroyed()
    ).subscribe(id => {
      this.dataService.updateManufacturer$.next(id);
    });

    this.dataService.manufacturerData$.pipe(
      filter((m): m is ManufacturerDetail => !!m),
      this.takeUntilDestroyed()
    ).subscribe(manufacturer => {
      this.seoAndUtilsService.updateSeo(
        {
          title: `${ manufacturer.name } - Manufacturer`,
          description: `Browse all Eurorack modules by ${ manufacturer.name } on patcher.xyz.`,
          keywords: `eurorack, modular, ${ manufacturer.name }, modules`,
          url: `https://patcher.xyz/manufacturers/details/${ manufacturer.id }`,
          image: this.logoUrl(manufacturer) ?? undefined,
        },
        `${ manufacturer.name } — Manufacturer`
      );
      this.injectManufacturerJsonLd(manufacturer);
    });
  }

  override ngOnDestroy(): void {
    clearJsonLdScript(JSONLD_SCRIPT_ID);
    super.ngOnDestroy();
  }
  
  
  logoUrl(manufacturer: ManufacturerDetail): string | null {
    return manufacturer.logo ? `${ this.dataService.logoStorageBase }${ manufacturer.logo }` : null;
  }

  copyWidgetSnippet(snippet: string | null | undefined): void {
    if (!snippet) return;
    this.urlCreatorService.copyTextToClipboard(
      snippet,
      'Widget embed snippet copied to clipboard.',
      'Clipboard write failed — copy the snippet manually.'
    );
  }
  
  private injectManufacturerJsonLd(manufacturer: ManufacturerDetail): void {
    clearJsonLdScript(JSONLD_SCRIPT_ID);
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': manufacturer.name ?? undefined,
      'url': manufacturer.websiteURL ?? undefined,
      'logo': this.logoUrl(manufacturer) ?? undefined,
    };
    Object.keys(jsonLd).forEach(k => jsonLd[k] === undefined && delete jsonLd[k]);
    upsertJsonLdScript(JSONLD_SCRIPT_ID, jsonLd);
  }
}
