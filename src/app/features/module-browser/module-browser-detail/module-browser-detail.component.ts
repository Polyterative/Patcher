import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import { Subject } from 'rxjs';
import {
  filter,
  map,
  takeUntil
} from 'rxjs/operators';
import { ModuleDetailDataService } from 'src/app/components/module-parts/module-detail-data.service';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { AppStateService } from "src/app/shared-interproject/app-state.service";
import { DbModule } from "src/app/models/module";
import {
  CommentableEntityTypes,
  CommentsDataService
} from "src/app/components/shared-atoms/comments/comments-data.service";
import { UserManagementService } from "src/app/features/backbone/login/user-management.service";
import { normalizeForSearch } from "src/app/shared-interproject/components/@smart/mat-form-entity/string-utils";
import {
  clearJsonLdScript,
  upsertJsonLdScript
} from "src/app/shared-interproject/json-ld-dom";
import { Animations } from "src/app/shared-interproject/SharedConstants";


const MODULE_PANELS_BASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/module-panels/';
const JSONLD_SCRIPT_ID = 'module-jsonld';

@Component({
  selector: 'app-module-browser-detail',
  templateUrl: './module-browser-detail.component.html',
  styleUrls: ['./module-browser-detail.component.scss'],
  providers: [CommentsDataService],
  animations: [
    Animations.fadeInOnEnter
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleBrowserDetailComponent implements OnInit, OnDestroy {
  
  protected destroyEvent$                      = new Subject<void>();
  @Input() ignoreSeo                           = false;
  @Input() viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    ellipseDescription: false,
    bigPanelImage: true,
    hidePanelsOptions: false
  };
  
  @Input() bySameManufacturerViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    ellipseDescription: true,
    hideButtons: true,
    hideDates: true,
    hideManufacturer: true,
    hideLabels: true,
    hideDescription: true,
    tagsShowCounts: false,
    tagsReadOnly: true,
    tagsMaxCount: 5
  };
  // hopefully these do not become too many
  searchLinks                                                    = [
    {
      url: (name: string, manufacturer: string) => `https://www.google.com/search?q=${ name } by ${ manufacturer }`,
      label: 'Google',
      icon: 'search',
      tooltip: 'Search on Google'
    },
    {
      url: (name: string, manufacturer: string) => `https://www.youtube.com/results?search_query=${ name }+${ manufacturer }`,
      label: 'YouTube',
      icon: 'video_library',
      tooltip: 'Search on YouTube'
    },
    {
      url: (name: string) => `https://www.modwiggler.com/forum/search.php?keywords=${ name }`,
      label: 'Modwiggler',
      icon: 'forum',
      tooltip: 'Search on Modwiggler'
    },
    {
      url: (name: string) => `https://llllllll.co/search?q=${ name }`,
      label: 'Lines',
      icon: 'forum',
      tooltip: 'Search on Lines'
    },
    {
      url: (name: string) => `https://www.elektronauts.com/search?q=${ name }`,
      label: 'Elektronauts',
      icon: 'forum',
      tooltip: 'Search on Elektronauts'
    },
    {
      url: (name: string) => `https://modulargrid.net/e/modules/browser?SearchName=${ name }`,
      label: 'Modulargrid',
      icon: 'power',
      tooltip: 'Search on Modulargrid'
    },
    {
      url: (name: string) => `https://library.vcvrack.com/?query=${ name }`,
      label: 'VCV Library',
      icon: 'power',
      tooltip: 'Search on VCV Library'
    },
    {
      url: (name: string) => `https://wigglehunt.com/?query=${ name }`,
      label: 'Wigglehunt',
      // icon regarding prices
      icon: 'attach_money',
      tooltip: 'Search on Modulargrid'
    },
    {
      url: (name: string) => `https://www.thomann.de/intl/search_dir.html?sw=${ name }`,
      label: 'Thomann 🇩🇪',
      icon: 'store',
      tooltip: 'Search on Thomann'
    },
    {
      url: (name: string) => `https://schneidersladen.de/en/search?sSearch=${ name }`,
      label: 'Schneidersladen 🇩🇪',
      icon: 'store',
      tooltip: 'Search on Schneidersladen'
    },
    {
      url: (name: string) => `https://www.signalsounds.com/search.php?search_query=${ name }`,
      label: 'Signalsounds 🇬🇧',
      icon: 'store',
      tooltip: 'Search on Signalsounds'
    },
    {
      url: (name: string) => `https://www.exploding-shed.com/search?search=${ name }`,
      label: 'Exploding Shed 🇩🇪',
      icon: 'store',
      tooltip: 'Search on Exploding Shed'
    },
    {
      url: (name: string) => `https://eu.elevatorsound.com/shop/?_sf_s=${ name }`,
      label: 'Elevatorsound 🇬🇧',
      icon: 'store',
      tooltip: 'Search on Elevatorsound'
    },
    {
      url: (name: string) => `https://www.perfectcircuit.com/catalogsearch/result/?q=${ name }`,
      label: 'Perfect Circuit 🇺🇸',
      icon: 'store',
      tooltip: 'Search on Perfect Circuit'
    },
    {
      url: (name: string) => `https://www.milkaudiostore.com/it/search?term=${ name }`,
      label: 'Milk Audio Store 🇮🇹',
      icon: 'store',
      tooltip: 'Search on Milk Audio Store'
    },
    {
      url: (name: string) => `https://www.newgroove.it/?product_cat=0&s=${ name }&post_type=product&et_search=true`,
      // italian emoji
      label: 'New Groove 🇮🇹',
      icon: 'store',
      tooltip: 'Search on New Groove'
    },
    {
      url: (name: string) => `https://escapefromnoise.com/search/?q=${ name }&lang=en`,
      label: 'Escape From Noise 🇸🇪',
      icon: 'store',
      tooltip: 'Search on Escape From Noise'
    },
    {
      url: (name: string) => `https://machineroom.com.ua/?s=${ name }`,
      label: 'Machineroom 🇺🇦',
      icon: 'store',
      tooltip: 'Search on Machineroom'
    },
    {
      url: (name) => `https://www.ctrl-mod.com/search?type=product&q=${ name }`,
      label: 'Control 🇺🇸',
      icon: 'store',
      tooltip: 'Search on Control'
    },
    {
      url: (name) => `https://www.patchwerks.com/search?q=${ name }`,
      label: 'Patchwerks 🇺🇸',
      icon: 'store',
      tooltip: 'Search on Patchwerks'
    },
    {
      url: (name) => `https://foundsound.com.au/search?q=${ name }`,
      label: 'Found Sound 🇦🇺',
      icon: 'store',
      tooltip: 'Search on Found Sound'
    },
    
    {
      url: (name) => `https://synthshop.no/search?q=${ name }`,
      label: 'Synthshop 🇳🇴',
      icon: 'store',
      tooltip: 'Search on Synthshop'
    },
    
  ];
  
  constructor(
    public dataService: ModuleDetailDataService,
    public route: ActivatedRoute,
    public router: Router,
    readonly seoAndUtilsService: SeoAndUtilsService,
    public appState: AppStateService,
    private commentsDataService: CommentsDataService,
    public userManagementService: UserManagementService,
  ) {
    
  }

  
  ngOnInit(): void {
    if (!this.ignoreSeo) { this.seoAndUtilsService.updateSeo({}, 'Module Details'); }
    
    // every time we get the new data for the new module, send the data about the context to the comments service
    this.dataService.singleModuleData$
      .pipe(
        filter(x => !!x),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(data => {
        this.commentsDataService.requestCommentsUpdate$.next({entityId: data.id, entityType: CommentableEntityTypes.MODULE});
      });
    
    // every time we are waiting for new data, tell the comments service to reset its contents
    this.dataService.updateSingleModuleData$
      .pipe(
        filter(x => !x),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(() => {
        this.commentsDataService.requestReset$.next();
      });
    
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
          takeUntil(this.destroyEvent$)
        )
        .subscribe(data => {
          const rawTags = data.tags.map(x => x.tag.name).filter(x => !!x);
          
          const ins  = data.ins.map(x => x.name);
          const outs = data.outs.map(x => x.name);
          
          const keywords = [
            'eurorack',
            'module',
            data.manufacturer.name,
            data.name,
            rawTags,
            ins,
            outs
          ]
            .flatMap(x => x)
            .map(x => normalizeForSearch(x))
            .map(x => x.replace(/[^a-z0-9]/g, ''))
            .filter(x => !!x)
            .map(x => x.trim())
            .join(', ');
          
          const tagsClean = rawTags.map(x => x.replace(/[^a-z0-9]/g, '')).filter(x => !!x).map(x => x.trim()).join(', ');
          
          const descParts: string[] = [];
          if (data.description) { descParts.push(data.description.trim()); }
          descParts.push(`${ data.hp } HP wide eurorack module by ${ data.manufacturer.name }.`);
          if (data.ins.length || data.outs.length) {
            descParts.push(`${ data.ins.length } input${ data.ins.length !== 1 ? 's' : '' } and ${ data.outs.length } output${ data.outs.length !== 1 ? 's' : '' }.`);
          }
          const powerParts: string[] = [];
          if (data.powerPos12) { powerParts.push(`+12V: ${ data.powerPos12 }mA`); }
          if (data.powerNeg12) { powerParts.push(`-12V: ${ data.powerNeg12 }mA`); }
          if (data.powerPos5) { powerParts.push(`+5V: ${ data.powerPos5 }mA`); }
          if (powerParts.length) { descParts.push(`Power draw — ${ powerParts.join(', ') }.`); }
          if (data.depth) { descParts.push(`Depth: ${ data.depth }mm.`); }
          if (data.isDIY) { descParts.push(`DIY module.`); }
          if (tagsClean) { descParts.push(`Tags: ${ tagsClean }.`); }

          const seoData: SeoSocialShareData = {
            title: `${ data.name } - details.`,
            description: descParts.join(' '),
            keywords: keywords,
            published: data.created,
            modified: data.updated,
          };
          this.seoAndUtilsService.updateSeo(seoData,
            `${ data.name } by ${ data.manufacturer.name } - Module Details`);
          this.injectModuleJsonLd(data);
        });
    }
  }

  ngOnDestroy(): void {
    clearJsonLdScript(JSONLD_SCRIPT_ID);
    this.dataService.singleModuleData$.next(undefined);
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }

  private injectModuleJsonLd(data: DbModule): void {
    clearJsonLdScript(JSONLD_SCRIPT_ID);
    const panelFilename = data.panels?.[0]?.filename;
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': data.name ?? undefined,
      'description': data.description ?? undefined,
      'brand': {
        '@type': 'Brand',
        'name': data.manufacturer?.name ?? undefined,
      },
      'url': `https://patcher.xyz/modules/details/${ data.id }`,
      'image': panelFilename ? `${ MODULE_PANELS_BASE_URL }${ panelFilename }` : undefined,
    };
    Object.keys(jsonLd).forEach(k => jsonLd[k] === undefined && delete jsonLd[k]);
    upsertJsonLdScript(JSONLD_SCRIPT_ID, jsonLd);
  }
  
  private patchDevModule(changes: Partial<DbModule>): void {
    this.dataService.changeModule$.next(changes);
  }
  
  setDevStandard(id: number): void {
    this.patchDevModule({
      standard: {
        id,
        name: ''
      }
    });
  }
  
  setDevComplete(isComplete: boolean): void {
    this.patchDevModule({isComplete});
  }
  
  setDevApproved(isApproved: boolean): void {
    this.patchDevModule({isApproved});
  }
  
  setDevDIY(isDIY: boolean): void {
    this.patchDevModule({isDIY});
  }

  adjustDevHp(module: Pick<DbModule, 'hp'>, delta: number): void {
    const currentHp = Number.isFinite(module.hp) ? module.hp : 0;
    this.patchDevModule({hp: Math.max(0, currentHp + delta)});
  }
  
  trimDevTextFields(module: DbModule): void {
    const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();
    this.patchDevModule({
      name: normalizeText(module.name || ''),
      description: normalizeText(module.description || ''),
      manualURL: (module.manualURL || '').trim()
    });
  }
  
  clearDevManualUrl(): void {
    this.patchDevModule({manualURL: ''});
  }

  manualUrlDraft: string = '';

  setDevManualUrl(): void {
    if (!this.manualUrlDraft) return;
    this.patchDevModule({manualURL: this.manualUrlDraft.trim()});
    this.manualUrlDraft = '';
  }
  
  clampDevNumericFields(module: DbModule): void {
    const clamp = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
    this.patchDevModule({
      hp: clamp(module.hp),
      depth: clamp(module.depth),
      weight: clamp(module.weight),
      powerPos12: clamp(module.powerPos12),
      powerNeg12: clamp(module.powerNeg12),
      powerPos5: clamp(module.powerPos5)
    });
  }
  
  submitSimilar(
    data: Partial<DbModule>
  ) {
    // [href]="'/modules/add?manufacturer='+bag.data.manufacturer.id+'&HP='+bag.data.hp+'standard='+bag.data.standard.id"
    // this.router.navigate(['/modules', 'add'], {
    //   queryParams: {
    //     manufacturer: data.manufacturerId,
    //     HP:           data.hp,
    //     standard:     data.standard.id
    //   }
    // });
    
    // full navigation with reload, plain JS href, new tab
    window.open(`/modules/add?manufacturer=${ data.manufacturerId }&HP=${ data.hp }&standard=${ data.standard.id }`, '_blank');
    // window.location.href = `/modules/add?manufacturer=${ data.manufacturerId }&HP=${ data.hp }&standard=${ data.standard.id }`;
    
  }
  
  openManual(data: DbModule) {
    window.open(data.manualURL, '_blank');
  }

  onEditorToggleRequest(editing: boolean, hasPendingEditorChanges: boolean): void {
    if (editing && hasPendingEditorChanges) {
      const confirmed = window.confirm('Discard unsaved changes and close the editor?');
      if (!confirmed) {
        return;
      }
    }
    this.dataService.requestModuleEditingToggle$.next();
  }

  confirmDeleteModuleAndOrphanManufacturer(module: DbModule): void {
    const confirmed = window.confirm(
      `Delete "${ module.name }" and remove manufacturer "${ module.manufacturer.name }" if no other modules still use it?`
    );

    if (!confirmed) {
      return;
    }

    this.dataService.deleteModuleAndOrphanManufacturer$.next(module);
  }
  
  openExternalLink(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
