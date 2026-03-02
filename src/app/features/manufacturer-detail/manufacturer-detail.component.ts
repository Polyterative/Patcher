import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import { Animations } from 'src/app/shared-interproject/SharedConstants';


const LOGO_BASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/manufacturer-logos/';
const JSONLD_SCRIPT_ID = 'manufacturer-jsonld';

@Component({
  selector: 'app-manufacturer-detail',
  templateUrl: './manufacturer-detail.component.html',
  styleUrls: ['./manufacturer-detail.component.scss'],
  providers: [ManufacturerDetailDataService],
  animations: [Animations.fadeInOnEnter],
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

  constructor(
    public readonly dataService: ManufacturerDetailDataService,
    private readonly route: ActivatedRoute,
    private readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    super();

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
    document.getElementById(JSONLD_SCRIPT_ID)?.remove();
    super.ngOnDestroy();
  }
  
  private injectManufacturerJsonLd(manufacturer: ManufacturerDetail): void {
    document.getElementById(JSONLD_SCRIPT_ID)?.remove();

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': manufacturer.name ?? undefined,
      'url': manufacturer.websiteURL ?? undefined,
      'logo': manufacturer.logo ? `${ LOGO_BASE_URL }${ manufacturer.logo }` : undefined,
    };
    
    // Remove undefined values before serialising
    Object.keys(jsonLd).forEach(k => jsonLd[k] === undefined && delete jsonLd[k]);
    
    const script = document.createElement('script');
    script.id = JSONLD_SCRIPT_ID;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }
}