import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  filter,
  map,
  takeUntil
} from 'rxjs/operators';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { ManufacturerDetailDataService } from 'src/app/features/manufacturer-detail/manufacturer-detail-data.service';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';


@Component({
  selector: 'app-manufacturer-detail',
  templateUrl: './manufacturer-detail.component.html',
  styleUrls: ['./manufacturer-detail.component.scss'],
  providers: [ManufacturerDetailDataService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ManufacturerDetailComponent extends SubManager implements OnInit {
  
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
    hideBySameManufacturer: true
  };
  
  constructor(
    public dataService: ManufacturerDetailDataService,
    private route: ActivatedRoute,
    private seoAndUtilsService: SeoAndUtilsService
  ) {
    super();
  }
  
  ngOnInit(): void {
    this.seoAndUtilsService.updateSeo({}, 'Manufacturer');
    
    this.route.params.pipe(
      map(params => params && params['id'] ? parseInt(params['id'], 10) : 0),
      filter(id => id > 0),
      takeUntil(this.destroy$)
    ).subscribe(id => {
      this.dataService.updateManufacturer$.next(id);
    });
    
    this.dataService.manufacturerData$.pipe(
      filter(m => !!m),
      takeUntil(this.destroy$)
    ).subscribe(manufacturer => {
      this.seoAndUtilsService.updateSeo(
        {
          title: `${ manufacturer.name } - Manufacturer`,
          description: `Browse all Eurorack modules by ${ manufacturer.name } on patcher.xyz.`,
          keywords: `eurorack, modular, ${ manufacturer.name }, modules`,
          url: `https://patcher.xyz/manufacturers/details/${ manufacturer.id }`
        },
        `${ manufacturer.name } — Manufacturer`
      );
      
      // JSON-LD for manufacturer entity
      this.injectManufacturerJsonLd(manufacturer);
    });
  }
  
  private injectManufacturerJsonLd(manufacturer: {
    id: number;
    name: string | null;
    logo: string | null;
    websiteURL: string | null;
  }): void {
    const existing = document.getElementById('manufacturer-jsonld');
    if (existing) {
      existing.remove();
    }
    
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': manufacturer.name,
      'url': manufacturer.websiteURL || undefined,
      'logo': manufacturer.logo
        ? `https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/manufacturer-logos/${ manufacturer.logo }`
        : undefined
    };
    
    // Remove undefined values
    Object.keys(jsonLd).forEach(k => jsonLd[k] === undefined && delete jsonLd[k]);
    
    const script = document.createElement('script');
    script.id = 'manufacturer-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }
  
  override ngOnDestroy(): void {
    const existing = document.getElementById('manufacturer-jsonld');
    if (existing) {
      existing.remove();
    }
    super.ngOnDestroy();
  }
}