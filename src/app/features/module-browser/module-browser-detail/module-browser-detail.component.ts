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
  ActivatedRoute,
  Router
} from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  Observable
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
import {
  DbModule,
  ModulePanel,
  UserModulePossessionKind
} from "src/app/models/module";
import { CommentsDataService } from "src/app/components/shared-atoms/comments/comments-data.service";
import { CommentableEntityTypes } from "src/app/models/comment";
import { UserManagementService } from "src/app/features/backbone/login/user-management.service";
import { clearJsonLdScript } from "src/app/shared-interproject/json-ld-dom";
import {
  JSONLD_SCRIPT_ID,
  MODULE_SEARCH_LINKS,
  SearchLink,
} from './module-browser-detail.constants';
import { environment } from 'src/environments/environment';
import {
  UserModuleAcquisition,
  UserModuleAcquisitionSource
} from 'src/app/models/user-module-acquisition';
import { ModuleEditorComponent } from 'src/app/components/module-parts/module-editor/module-editor.component';
import { derivePanelLabel } from 'src/app/components/module-parts/panel.constants';
import { ModulePriceListing } from 'src/app/features/backend/supabase-queries.models';
import { moduleBrowserDetailAnimations } from './module-browser-detail.animations';
import { buildModuleDetailSeoData, injectModuleJsonLd } from './module-browser-detail.seo';
import * as detailPresentation from './module-browser-detail.presentation';
import { ModuleCommunityStat } from './module-browser-detail.presentation';
import {
  getAvailableRetailerSearchLinks as getAvailableRetailerSearchLinksForListings,
  getManufacturerSearchLinks as getManufacturerSearchLinksForModule
} from './module-browser-detail.search-links';
import {
  createInitialPanelRatioDiagnostics,
  createMeasuredPanelRatioDiagnostic,
  measurePanelImage,
  MODULE_PANEL_RATIO_ACCEPTANCE_THRESHOLD,
  ModulePanelRatioDiagnostic
} from './module-browser-detail.panel-ratio';

export {
  calculateModulePanelRatioResult,
  MODULE_PANEL_RATIO_ACCEPTANCE_THRESHOLD,
  ModulePanelRatioDiagnostic,
  ModulePanelRatioResult,
  PanelImageDimensions
} from './module-browser-detail.panel-ratio';

@Component({
  selector: 'app-module-browser-detail',
  templateUrl: './module-browser-detail.component.html',
  styleUrls: ['./module-browser-detail.component.scss'],
  providers: [CommentsDataService],
  animations: moduleBrowserDetailAnimations,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleBrowserDetailComponent extends SubManager implements OnInit, OnDestroy {
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
  readonly communitySearchLinks: SearchLink[] = MODULE_SEARCH_LINKS.filter(link => link.kind === 'community');
  readonly retailerSearchLinks: SearchLink[] = MODULE_SEARCH_LINKS.filter(link => link.kind === 'retailer');
  readonly manufacturerSearchLinks: SearchLink[] = MODULE_SEARCH_LINKS.filter(link => link.kind === 'manufacturer');
  readonly availableRetailerSearchLinks$: Observable<SearchLink[]>;
  readonly collectionsEnabled = environment.features.collectionsEnabled;
  readonly coolReactionsEnabled = environment.features.coolReactionsEnabled;
  readonly panelRatioAcceptanceThreshold = MODULE_PANEL_RATIO_ACCEPTANCE_THRESHOLD;
  readonly panelRatioDiagnostics$ = new BehaviorSubject<ModulePanelRatioDiagnostic[]>([]);
  readonly mergeIntoTargetOpen$ = new BehaviorSubject<boolean>(false);
  readonly mergeIntoTargetError$ = new BehaviorSubject<string | null>(null);
  mergeTargetModuleIdDraft = '';
  manualUrlDraft: string = '';
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
    this.availableRetailerSearchLinks$ = this.dataService.modulePriceListings$
      .pipe(map(listings => this.getAvailableRetailerSearchLinks(listings)));
  }

  ngOnInit(): void {
    if (!this.ignoreSeo) { this.seoAndUtilsService.updateSeo({}, 'Module Details'); }

    this.dataService.singleModuleData$
      .pipe(
        filter(x => !!x),
        this.takeUntilDestroyed()
      )
      .subscribe(data => {
        this.commentsDataService.requestCommentsUpdate$.next({entityId: data.id, entityType: CommentableEntityTypes.MODULE});
      });

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
        filter(x => x > 0),
        this.takeUntilDestroyed()
      )
      .subscribe(data => {
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
          this.seoAndUtilsService.updateSeo(
            buildModuleDetailSeoData(data),
            `${ data.name } by ${ data.manufacturer.name } - Module Details`
          );
          injectModuleJsonLd(data);
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
    return detailPresentation.hasHiddenUsage(bucket);
  }

  getHiddenUsageSupplementCopy(kind: 'rack' | 'patch', bucket: HiddenUsageBucket | null | undefined): string {
    return detailPresentation.getHiddenUsageSupplementCopy(kind, bucket);
  }

  getNoPublicUsageCopy(kind: 'rack' | 'patch', bucket: HiddenUsageBucket | null | undefined): string {
    return detailPresentation.getNoPublicUsageCopy(kind, bucket);
  }

  getUsagePendingCopy(kind: 'rack' | 'patch'): string {
    return detailPresentation.getUsagePendingCopy(kind);
  }

  getModuleDetailTitleSub(moduleName: string | null | undefined, possessionKind: UserModulePossessionKind | null | undefined): string | undefined {
    return detailPresentation.getModuleDetailTitleSub(moduleName, possessionKind);
  }

  getCommunityData(counts: ModulePossessionCounts | undefined, coolCount: number | undefined): ModuleCommunityStat[] | undefined {
    return detailPresentation.getCommunityData(counts, coolCount);
  }

  getAvailableRetailerSearchLinks(listings: readonly ModulePriceListing[] | null | undefined): SearchLink[] {
    return getAvailableRetailerSearchLinksForListings(this.retailerSearchLinks, listings);
  }

  getManufacturerLinks(manufacturerId: number | null | undefined): SearchLink[] {
    return getManufacturerSearchLinksForModule(this.manufacturerSearchLinks, manufacturerId);
  }

  getDevDeletePanelLabel(panel: ModulePanel, index: number): string {
    return `Delete ${ this.getDevPanelDisplayName(panel, index) }`;
  }

  getDevDeletePanelTooltip(panel: ModulePanel, index: number): string {
    return `Remove ${ this.getDevPanelDisplayName(panel, index) } image from this module`;
  }

  formatAcquisitionValue(acquisition: UserModuleAcquisition): string {
    return detailPresentation.formatAcquisitionValue(acquisition);
  }

  getAcquisitionSourceLabel(source: UserModuleAcquisitionSource): string {
    return detailPresentation.getAcquisitionSourceLabel(source);
  }

  ngOnDestroy(): void {
    clearJsonLdScript(JSONLD_SCRIPT_ID);
    this.dataService.singleModuleData$.next(undefined);
    super.ngOnDestroy();
  }

  setDevStandard(id: number): void {
    this.patchDevModule({standard: {id, name: ''}});
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

  submitSimilar(data: Partial<DbModule>) {
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

  private patchDevModule(changes: Partial<DbModule>): void {
    this.dataService.changeModule$.next(changes);
  }

  private getDevPanelDisplayName(panel: ModulePanel, index: number): string {
    const label = derivePanelLabel(panel.filename, panel.description, index);
    const normalizedLabel = label.toLowerCase();

    return normalizedLabel.startsWith('panel ') || normalizedLabel.endsWith(' panel')
      ? label
      : `${ label } panel`;
  }

  private refreshPanelRatioDiagnostics(module: DbModule): void {
    const run = ++this.panelRatioMeasurementRun;
    const initialDiagnostics = createInitialPanelRatioDiagnostics(module);

    this.panelRatioDiagnostics$.next(initialDiagnostics);

    module.panels.forEach((panel, index) => {
      if (!panel.filename) {
        return;
      }

      measurePanelImage(panel.filename)
        .then(dimensions => {
          if (run !== this.panelRatioMeasurementRun) {
            return;
          }

          this.updatePanelRatioDiagnostic(panel.id, createMeasuredPanelRatioDiagnostic(
            module,
            panel.id,
            panel.filename,
            `Panel ${ index + 1 }`,
            dimensions,
            this.panelRatioAcceptanceThreshold
          ));
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
}
