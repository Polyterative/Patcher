import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {
  animateChild,
  animate,
  group,
  query,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import {
  BehaviorSubject,
  combineLatest
} from 'rxjs';
import {
  filter,
  map
} from 'rxjs/operators';
import {
  HiddenUsageBucket,
  ModuleDetailDataService
} from 'src/app/components/module-parts/module-detail-data.service';
import { ModulePossessionCounts } from 'src/app/components/module-parts/module-detail-data.models';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { AppStateService } from "src/app/shared-interproject/app-state.service";
import { Animations } from 'src/app/shared-interproject/SharedConstants';
import {
  DbModule,
  UserModulePossessionKind
} from "src/app/models/module";
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
import {
  JSONLD_SCRIPT_ID,
  MODULE_PANELS_BASE_URL,
  MODULE_SEARCH_LINKS,
  SearchLink,
} from './module-browser-detail.constants';
import { environment } from 'src/environments/environment';
import { getModulePanelAspectRatio } from 'src/app/components/module-parts/get-module-height-for-standard.pipe';
import {
  UserModuleAcquisition,
  UserModuleAcquisitionSource
} from 'src/app/models/user-module-acquisition';
import { formatMarketplaceMinorUnits } from 'src/app/features/marketplace/marketplace-money.utils';
import { ReactionEntityTypes } from 'src/app/features/backend/supabase-reactions';
import { ModuleEditorComponent } from 'src/app/components/module-parts/module-editor/module-editor.component';

export const MODULE_PANEL_RATIO_ACCEPTANCE_THRESHOLD = 0.01;

export interface PanelImageDimensions {
  width: number;
  height: number;
}

export interface ModulePanelRatioResult {
  expectedRatio: number;
  imageRatio: number;
  relativeDelta: number;
  deltaPercent: number;
  accepted: boolean;
}

export interface ModulePanelRatioDiagnostic {
  panelId: number;
  label: string;
  filename: string;
  expectedRatio: number;
  status: 'pending' | 'match' | 'mismatch' | 'unavailable' | 'error';
  imageWidth?: number;
  imageHeight?: number;
  imageRatio?: number;
  deltaPercent?: number;
  accepted?: boolean;
  error?: string;
}

interface ModuleCommunityStat {
  label: string;
  value: string;
  icon: string;
  size: string;
}

export function calculateModulePanelRatioResult(
  module: Pick<DbModule, 'hp' | 'standard'>,
  dimensions: PanelImageDimensions,
  threshold = MODULE_PANEL_RATIO_ACCEPTANCE_THRESHOLD
): ModulePanelRatioResult | null {
  if (!Number.isFinite(module.hp) || module.hp <= 0 || !Number.isFinite(dimensions.width) || !Number.isFinite(dimensions.height) || dimensions.width <= 0 || dimensions.height <= 0) {
    return null;
  }

  const expectedRatio = getModulePanelAspectRatio(module);
  const imageRatio = dimensions.width / dimensions.height;
  const relativeDelta = (imageRatio - expectedRatio) / expectedRatio;

  return {
    expectedRatio,
    imageRatio,
    relativeDelta,
    deltaPercent: relativeDelta * 100,
    accepted: Math.abs(relativeDelta) <= threshold
  };
}

@Component({
  selector: 'app-module-browser-detail',
  templateUrl: './module-browser-detail.component.html',
  styleUrls: ['./module-browser-detail.component.scss'],
  providers: [CommentsDataService],
  animations: [
    Animations.fadeInOnEnter,
    trigger('moduleDetailRailEnter', [
      transition(':enter', [
        style({
          opacity: 0,
        }),
        animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.2, 0, 0, 1)', style({
          opacity: 1,
        }))
      ], {
        params: { delay: 0, duration: 185 }
      })
    ]),
    trigger('moduleDetailSupportEnter', [
      transition(':enter', [
        style({
          opacity: 0,
        }),
        animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.22, 1, 0.36, 1)', style({
          opacity: 1,
        }))
      ], {
        params: { delay: 0, duration: 190 }
      })
    ]),
    trigger('moduleDetailDataEnter', [
      transition(':enter', [
        style({
          opacity: 0,
        }),
        animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.2, 0, 0, 1)', style({
          opacity: 1,
        })),
        query('@moduleDetailSupportEnter', animateChild(), { optional: true })
      ], {
        params: { delay: 0, duration: 180 }
      })
    ]),
    trigger('moduleDetailFabEnter', [
      transition(':enter', [
        style({
          opacity: 0,
        }),
        animate('{{ duration }}ms {{ delay }}ms cubic-bezier(0.22, 1, 0.36, 1)', style({
          opacity: 1,
        }))
      ], {
        params: { delay: 0, duration: 175 }
      })
    ]),
    trigger('moduleDetailPaneSwap', [
      transition(':enter', [
        style({
          opacity: 0,
          height: 0,
          transform: 'translateY(0.9rem)',
          overflow: 'hidden'
        }),
        group([
          animate('280ms cubic-bezier(0.22, 1, 0.36, 1)', style({
            opacity: 1,
            height: '*',
            transform: 'translateY(0)'
          })),
          query('@*', animateChild(), { optional: true })
        ])
      ]),
      transition(':leave', [
        style({
          overflow: 'hidden'
        }),
        animate('210ms cubic-bezier(0.4, 0, 1, 1)', style({
          opacity: 0,
          height: 0,
          transform: 'translateY(-0.55rem)'
        }))
      ])
    ]),
    trigger('moduleDetailModeTransition', [
      transition('false => true', [
        group([
          query('.module-detail-column--middle', [
            animate('240ms cubic-bezier(0.2, 0, 0, 1)', style({
              transform: 'translateY(0.35rem)'
            }))
          ], {optional: true}),
          query('.module-detail-column--right', [
            style({
              transform: 'translateY(0.55rem) scale(0.992)',
              opacity: 0.92
            }),
            animate('280ms cubic-bezier(0.22, 1, 0.36, 1)', style({
              transform: 'translateY(0) scale(1)',
              opacity: 1
            }))
          ], {optional: true})
        ])
      ]),
      transition('true => false', [
        group([
          query('.module-detail-column--middle', [
            animate('220ms cubic-bezier(0.22, 1, 0.36, 1)', style({
              transform: 'translateY(0)'
            }))
          ], {optional: true}),
          query('.module-detail-column--right', [
            style({
              transform: 'translateY(-0.35rem) scale(0.992)',
              opacity: 0.92
            }),
            animate('260ms cubic-bezier(0.22, 1, 0.36, 1)', style({
              transform: 'translateY(0) scale(1)',
              opacity: 1
            }))
          ], {optional: true})
        ])
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleBrowserDetailComponent extends SubManager implements OnInit, OnDestroy {
  readonly ReactionEntityTypes = ReactionEntityTypes;
  @ViewChild(ModuleEditorComponent) moduleEditor?: ModuleEditorComponent;
  @Input() ignoreSeo                           = false;
  @Input() showManualButton                    = false;
  @Input() viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    ellipseDescription: false,
    bigPanelImage: true,
    hidePanelsOptions: false,
    colorTagsByAxis: true,
    highlightDescriptionKeywords: true,
    showDescriptionAnalysis: true,
    showFrequencyAnalysis: true
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
  readonly searchLinks: SearchLink[] = MODULE_SEARCH_LINKS;
  readonly collectionsEnabled = environment.features.collectionsEnabled;
  readonly coolReactionsEnabled = environment.features.coolReactionsEnabled;
  readonly panelRatioAcceptanceThreshold = MODULE_PANEL_RATIO_ACCEPTANCE_THRESHOLD;
  readonly panelRatioDiagnostics$ = new BehaviorSubject<ModulePanelRatioDiagnostic[]>([]);
  readonly mergeIntoTargetOpen$ = new BehaviorSubject<boolean>(false);
  readonly mergeIntoTargetError$ = new BehaviorSubject<string | null>(null);
  mergeTargetModuleIdDraft = '';
  private panelRatioMeasurementRun = 0;
  
  constructor(
    public dataService: ModuleDetailDataService,
    public route: ActivatedRoute,
    public router: Router,
    readonly seoAndUtilsService: SeoAndUtilsService,
    public appState: AppStateService,
    private commentsDataService: CommentsDataService,
    public userManagementService: UserManagementService,
  ) {
    super();
    
  }

  
  ngOnInit(): void {
    if (!this.ignoreSeo) { this.seoAndUtilsService.updateSeo({}, 'Module Details'); }
    
    // every time we get the new data for the new module, send the data about the context to the comments service
    this.dataService.singleModuleData$
      .pipe(
        filter(x => !!x),
        this.takeUntilDestroyed()
      )
      .subscribe(data => {
        this.commentsDataService.requestCommentsUpdate$.next({entityId: data.id, entityType: CommentableEntityTypes.MODULE});
      });
    
    // every time we are waiting for new data, tell the comments service to reset its contents
    this.dataService.updateSingleModuleData$
      .pipe(
        filter(x => !x),
        this.takeUntilDestroyed()
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

    this.dataService.moduleMergeResult$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => this.cancelMergeIntoTarget());
    
    if (!this.ignoreSeo) {
      this.dataService.singleModuleData$
        .pipe(
          filter(x => !!x),
          this.takeUntilDestroyed()
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
          if (data.powerPos12 != null) { powerParts.push(`+12V: ${ data.powerPos12 }mA`); }
          if (data.powerNeg12 != null) { powerParts.push(`-12V: ${ data.powerNeg12 }mA`); }
          if (data.powerPos5 != null) { powerParts.push(`+5V: ${ data.powerPos5 }mA`); }
          if (powerParts.length) { descParts.push(`Power draw — ${ powerParts.join(', ') }.`); }
          if (data.depth) { descParts.push(`Depth: ${ data.depth }mm.`); }
          if (data.isDIY) { descParts.push(`DIY module.`); }
          if (tagsClean) { descParts.push(`Tags: ${ tagsClean }.`); }

          const panelImage = data.panels?.[0]?.filename
            ? `${ MODULE_PANELS_BASE_URL }${ data.panels[0].filename }`
            : undefined;
          const seoData: SeoSocialShareData = {
            title: `${ data.name } - details.`,
            description: descParts.join(' '),
            keywords: keywords,
            published: data.created,
            modified: data.updated,
            image: panelImage,
          };
          this.seoAndUtilsService.updateSeo(seoData,
            `${ data.name } by ${ data.manufacturer.name } - Module Details`);
          this.injectModuleJsonLd(data);
        });
    }

    combineLatest([
      this.dataService.singleModuleData$,
      this.dataService.isAdmin$
    ])
      .pipe(this.takeUntilDestroyed())
      .subscribe(([module, isAdmin]) => {
        if (!module || !(this.appState.isDev || isAdmin)) {
          this.panelRatioMeasurementRun++;
          this.panelRatioDiagnostics$.next([]);
          return;
        }

        this.refreshPanelRatioDiagnostics(module);
      });
  }

  hasHiddenUsage(bucket: HiddenUsageBucket | null | undefined): boolean {
    return !!bucket && bucket !== 'none';
  }

  getHiddenUsageSupplementCopy(kind: 'rack' | 'patch', bucket: HiddenUsageBucket | null | undefined): string {
    return `Plus ${ this.getHiddenUsageDescriptor(bucket) } private or otherwise hidden ${ this.getHiddenUsageNoun(kind) }.`;
  }

  getNoPublicUsageCopy(kind: 'rack' | 'patch', bucket: HiddenUsageBucket | null | undefined): string {
    if (!this.hasHiddenUsage(bucket)) {
      return `No ${ this.getHiddenUsageNoun(kind) } using this module yet. Try adding it to yours!`;
    }

    return `No public ${ this.getHiddenUsageNoun(kind) } using this module yet. It still appears in ${ this.getHiddenUsageDescriptor(bucket) } private or otherwise hidden ${ this.getHiddenUsageNoun(kind) }.`;
  }

  getUsagePendingCopy(kind: 'rack' | 'patch'): string {
    return `Checking private and hidden ${ kind } usage...`;
  }

  getModuleDetailTitleSub(moduleName: string | null | undefined, possessionKind: UserModulePossessionKind | null | undefined): string | undefined {
    if (!moduleName) {
      return 'Loading...';
    }

    const possessionLabel = this.getPossessionLabel(possessionKind);
    return possessionLabel ? `${ moduleName } (${ possessionLabel })` : moduleName;
  }

  getCommunityData(counts: ModulePossessionCounts | undefined, coolCount: number | undefined): ModuleCommunityStat[] | undefined {
    if (!counts || coolCount === undefined) return undefined;

    const stats: ModuleCommunityStat[] = [
      { label: 'Cool', value: coolCount.toString(), icon: 'auto_awesome', size: 'auto' },
      { label: 'Owners', value: counts.hasCount.toString(), icon: 'inventory_2', size: 'auto' },
      { label: 'Wishlist', value: counts.wantsCount.toString(), icon: 'star_outline', size: 'auto' },
      { label: 'For Sale', value: counts.sellsCount.toString(), icon: 'sell', size: 'auto' }
    ].filter(stat => Number(stat.value) > 0);

    return stats.length > 0 ? stats : undefined;
  }

  formatAcquisitionValue(acquisition: UserModuleAcquisition): string {
    if (acquisition.price_amount_minor === null || !acquisition.currency) {
      return 'No price recorded';
    }
    return formatMarketplaceMinorUnits(acquisition.price_amount_minor, acquisition.currency);
  }

  getAcquisitionSourceLabel(source: UserModuleAcquisitionSource): string {
    return source === 'unknown'
      ? 'source unknown'
      : source.replace('_', ' ');
  }

  ngOnDestroy(): void {
    clearJsonLdScript(JSONLD_SCRIPT_ID);
    this.dataService.singleModuleData$.next(undefined);
    super.ngOnDestroy();
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

  private getHiddenUsageDescriptor(bucket: HiddenUsageBucket | null | undefined): string {
    switch (bucket) {
      case 'some':
        return 'some';
      case '5_plus':
        return '5+';
      case '10_plus':
        return '10+';
      case '25_plus':
        return '25+';
      default:
        return 'no';
    }
  }

  private getHiddenUsageNoun(kind: 'rack' | 'patch'): 'racks' | 'patches' {
    return kind === 'rack' ? 'racks' : 'patches';
  }

  private getPossessionLabel(kind: UserModulePossessionKind | null | undefined): string | null {
    switch (kind) {
      case 'HAS':
        return 'Owned';
      case 'WANTS':
        return 'Wanted';
      case 'SELLS':
        return 'For sale';
      default:
        return null;
    }
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

  openMergeIntoTargetForm(): void {
    this.mergeTargetModuleIdDraft = '';
    this.mergeIntoTargetError$.next(null);
    this.mergeIntoTargetOpen$.next(true);
  }

  cancelMergeIntoTarget(): void {
    this.mergeTargetModuleIdDraft = '';
    this.mergeIntoTargetError$.next(null);
    this.mergeIntoTargetOpen$.next(false);
  }

  confirmMergeIntoTarget(source: DbModule): void {
    const targetId = Number.parseInt(this.mergeTargetModuleIdDraft, 10);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      this.mergeIntoTargetError$.next('Enter a valid positive numeric target module ID.');
      return;
    }

    if (targetId === source.id) {
      this.mergeIntoTargetError$.next('Target module must be different from this source module.');
      return;
    }

    this.mergeIntoTargetError$.next(null);
    const confirmed = window.confirm(`Merge "${ source.name }" (${ source.id }) into target module ${ targetId }, then delete the source module?`);
    if (!confirmed) {
      return;
    }
    this.dataService.mergeIntoTargetModule$.next({sourceId: source.id, targetId});
  }

  manualUrlDraft: string = '';

  setDevManualUrl(): void {
    if (!this.manualUrlDraft) return;
    this.patchDevModule({manualURL: this.manualUrlDraft.trim()});
    this.manualUrlDraft = '';
  }
  
  clampDevNumericFields(module: DbModule): void {
    const clamp = (value: number | null | undefined) => Number.isFinite(value) ? Math.max(0, value) : 0;
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
    window.open(`/modules/add?manufacturer=${ data.manufacturerId }&HP=${ data.hp }&standard=${ data.standard.id }`, '_blank');
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

  formatPanelRatio(value: number | null | undefined): string {
    return Number.isFinite(value) ? value.toFixed(4) : 'n/a';
  }

  formatPanelRatioDelta(value: number | null | undefined): string {
    if (!Number.isFinite(value)) {
      return 'n/a';
    }

    return `${ value > 0 ? '+' : '' }${ value.toFixed(2) }%`;
  }

  private refreshPanelRatioDiagnostics(module: DbModule): void {
    const run = ++this.panelRatioMeasurementRun;
    const initialDiagnostics = module.panels.map((panel, index): ModulePanelRatioDiagnostic => ({
      panelId: panel.id,
      label: `Panel ${ index + 1 }`,
      filename: panel.filename,
      expectedRatio: getModulePanelAspectRatio(module),
      status: panel.filename ? 'pending' : 'unavailable',
      error: panel.filename ? undefined : 'No filename'
    }));

    this.panelRatioDiagnostics$.next(initialDiagnostics);

    module.panels.forEach((panel, index) => {
      if (!panel.filename) {
        return;
      }

      this.measurePanelImage(panel.filename)
        .then(dimensions => {
          if (run !== this.panelRatioMeasurementRun) {
            return;
          }

          const result = calculateModulePanelRatioResult(module, dimensions, this.panelRatioAcceptanceThreshold);
          this.updatePanelRatioDiagnostic(panel.id, {
            panelId: panel.id,
            label: `Panel ${ index + 1 }`,
            filename: panel.filename,
            expectedRatio: result?.expectedRatio ?? getModulePanelAspectRatio(module),
            status: result?.accepted ? 'match' : 'mismatch',
            imageWidth: dimensions.width,
            imageHeight: dimensions.height,
            imageRatio: result?.imageRatio,
            deltaPercent: result?.deltaPercent,
            accepted: result?.accepted
          });
        })
        .catch(() => {
          if (run !== this.panelRatioMeasurementRun) {
            return;
          }

          this.updatePanelRatioDiagnostic(panel.id, {
            ...initialDiagnostics[index],
            status: 'error',
            error: 'Image failed to load'
          });
        });
    });
  }

  private updatePanelRatioDiagnostic(panelId: number, diagnostic: ModulePanelRatioDiagnostic): void {
    this.panelRatioDiagnostics$.next(
      this.panelRatioDiagnostics$.value.map(item => item.panelId === panelId ? diagnostic : item)
    );
  }

  private measurePanelImage(filename: string): Promise<PanelImageDimensions> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({
        width: image.naturalWidth,
        height: image.naturalHeight
      });
      image.onerror = () => reject(new Error('Panel image failed to load'));
      image.src = `${ MODULE_PANELS_BASE_URL }${ filename }`;
    });
  }
}
