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
  map,
  takeUntil
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
import { TimeagoPipe } from 'ngx-timeago';
import {
  clearJsonLdScript,
  upsertJsonLdScript
} from 'src/app/shared-interproject/json-ld-dom';


const LOGO_BASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/manufacturer-logos/';
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
  };
  
  stats$: Observable<LabelValueData[]>;

  constructor(
    public readonly dataService: ManufacturerDetailDataService,
    private readonly route: ActivatedRoute,
    private readonly seoAndUtilsService: SeoAndUtilsService,
    private readonly timeago: TimeagoPipe
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
          ? this.timeago.transform(manufacturer.latestModuleUpdatedAt) as string
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


    this.seoAndUtilsService.updateSeo({}, 'Manufacturer');

    this.route.params.pipe(
      map(params => params && params['id'] ? parseInt(params['id'], 10) : 0),
      filter(id => id > 0),
      takeUntil(this.destroy$)
    ).subscribe(id => {
      this.dataService.updateManufacturer$.next(id);
    });

    this.dataService.manufacturerData$.pipe(
      filter((m): m is ManufacturerDetail => !!m),
      takeUntil(this.destroy$)
    ).subscribe(manufacturer => {
      this.seoAndUtilsService.updateSeo(
        {
          title: `${ manufacturer.name } - Manufacturer`,
          description: `Browse all Eurorack modules by ${ manufacturer.name } on patcher.xyz.`,
          keywords: `eurorack, modular, ${ manufacturer.name }, modules`,
          url: `https://patcher.xyz/manufacturers/details/${ manufacturer.id }`,
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
    return manufacturer.logo ? `${ LOGO_BASE_URL }${ manufacturer.logo }` : null;
  }
  
  private injectManufacturerJsonLd(manufacturer: ManufacturerDetail): void {
    clearJsonLdScript(JSONLD_SCRIPT_ID);
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': manufacturer.name ?? undefined,
      'url': manufacturer.websiteURL ?? undefined,
      'logo': manufacturer.logo ? `${ LOGO_BASE_URL }${ manufacturer.logo }` : undefined,
    };
    Object.keys(jsonLd).forEach(k => jsonLd[k] === undefined && delete jsonLd[k]);
    upsertJsonLdScript(JSONLD_SCRIPT_ID, jsonLd);
  }
}
