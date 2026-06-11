import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import {
  BehaviorSubject,
  merge,
  Observable
} from 'rxjs';
import {
  mapTo,
  shareReplay,
  startWith,
  takeUntil
} from 'rxjs/operators';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { RecentActivityItem } from 'src/app/components/shared-atoms/recent-activity/recent-activity.model';
import { ModuleBrowserDataService } from 'src/app/features/module-browser/module-browser-data.service';
import { ModuleBrowserRecentActivityService } from 'src/app/features/module-browser/module-browser-recent-activity.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';
import { ActivatedRoute } from '@angular/router';
import {
  MinimalModule,
  RackedModule
} from 'src/app/models/module';
import { Tag, TagSuggestionGroup } from 'src/app/models/tag';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ModuleList } from '../module-browser-data.service';


type RackModuleBrowseMode = 'available' | 'owned' | 'wanted' | 'all';
const OWNED_MODULES_DEFAULT_THRESHOLD = 20;

@Component({
  selector: 'app-module-browser-root',
  templateUrl: './module-browser-root.component.html',
  styleUrls: ['./module-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ModuleBrowserRecentActivityService],
  standalone: false,
  animations: [
    trigger('chipExpand', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden', minHeight: 0 }),
        animate('220ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate('160ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: 0, opacity: 0, minHeight: 0 }))
      ])
    ]),
    trigger('toggleExpand', [
      transition(':enter', [
        style({ transform: 'scale(0.7)', opacity: 0 }),
        animate('200ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('140ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'scale(0.7)', opacity: 0 }))
      ])
    ])
  ]
})
export class ModuleBrowserRootComponent extends SubManager implements OnInit {
  @Input() showSubmitFab = true;
  @Input() showWideShellNav = true;
  @Input() compactSidebarAtTablet = false;
  @Input() titleBig = 'Modules';
  @Input() titleSub = '';
  @Input() compactTitleSub = false;
  @Input() description = '';
  @Input() showRecentActivity = true;
  @Input() manageSeo = true;
  mobileFiltersExpanded = false;
  readonly recentActivityItems$: Observable<RecentActivityItem[]>;
  readonly modulesUpdating$: Observable<boolean>;
  readonly visibleModules$ = new BehaviorSubject<ModuleList>(null);
  readonly visibleItemsCount$ = new BehaviorSubject<number>(0);
  readonly ownedModulesDefaultThreshold = OWNED_MODULES_DEFAULT_THRESHOLD;
  collectionBrowseMode: RackModuleBrowseMode = 'all';

  get hasMoreModules(): boolean {
    const total = this.dataService.serversideAdditionalData.itemsCount$.value;
    const loaded = this.dataService.modulesList$.value?.length ?? 0;
    return !this.usesOwnedDataset && loaded < total;
  }

  get remainingModulesCount(): number {
    const total = this.dataService.serversideAdditionalData.itemsCount$.value;
    const loaded = this.dataService.modulesList$.value?.length ?? 0;
    return Math.max(0, total - loaded);
  }

  loadMore(): void {
    this.dataService.loadMore$.next();
  }

  private _enableCollectionBrowseModes = false;
  private hasManualCollectionBrowseModeSelection = false;
  private ownedModules: MinimalModule[] | undefined;
  private currentRackModuleIds = new Set<number>();

  @Input()
  set enableCollectionBrowseModes(value: boolean) {
    this._enableCollectionBrowseModes = value;
    this.applyAdaptiveCollectionBrowseMode();
    this.syncVisibleModules();
  }

  get enableCollectionBrowseModes(): boolean {
    return this._enableCollectionBrowseModes;
  }

  @Input()
  set ownedModulesInput(value: MinimalModule[] | undefined) {
    this.ownedModules = value;
    if (!this.showWantedBrowseMode && this.collectionBrowseMode === 'wanted') {
      this.collectionBrowseMode = 'owned';
    }
    this.applyAdaptiveCollectionBrowseMode();
    this.syncVisibleModules();
  }

  @Input()
  set currentRackModulesInput(value: RackedModule[][] | null | undefined) {
    this.currentRackModuleIds = new Set(
      (value ?? [])
        .flatMap((row) => row ?? [])
        .map((rackedModule) => rackedModule.module.id)
    );
    if (!this.showAvailableBrowseMode && this.collectionBrowseMode === 'available') {
      this.collectionBrowseMode = 'owned';
    }
    this.applyAdaptiveCollectionBrowseMode();
    this.syncVisibleModules();
  }

  @Input() readonly viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideButtons:      true,
    hideDates:        false,
    hideDescription:  false,
    hideHP:           false,
    hideTags:         false,
    hideManufacturer: false,
    hideLabels: true,
    tagsShowCounts: false,
    tagsMaxCount: 5
  };

  constructor(
    public dataService: ModuleBrowserDataService,
    private recentActivityService: ModuleBrowserRecentActivityService,
    readonly seoAndUtilsService: SeoAndUtilsService,
    private route: ActivatedRoute
  ) {
    super();

    this.recentActivityItems$ = this.recentActivityService.getRecentActivityItems$(this.dataService.modulesList$);
    this.modulesUpdating$ = merge(
      this.dataService.modulesLoadingTrigger$.pipe(mapTo(true)),
      this.dataService.modulesList$.pipe(mapTo(false))
    ).pipe(
      startWith(false),
      shareReplay({bufferSize: 1, refCount: true}),
      takeUntil(this.destroy$)
    );

    merge(
      this.dataService.modulesList$,
      this.dataService.serversideAdditionalData.itemsCount$,
      this.dataService.serversideTableRequestData.skip$,
      this.dataService.serversideTableRequestData.take$,
      this.dataService.fields.name.control.valueChanges,
      this.dataService.fields.description.control.valueChanges,
      this.dataService.fields.manufacturers.control.valueChanges,
      this.dataService.fields.hp.control.valueChanges,
      this.dataService.fields.hpCondition.control.valueChanges,
      this.dataService.fields.standard.control.valueChanges,
      this.dataService.fields.tags.control.valueChanges,
      this.dataService.tagMatchMode$,
      this.dataService.fields.order.control.valueChanges
    )
      .pipe(
        startWith(null),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.syncVisibleModules());

    this.dataService.fields.order.control.patchValue(this.dataService.orderStartingValue, {emitEvent: false});
    this.dataService.serversideTableRequestData.sort$.next([this.dataService.orderStartingValue.id, 'desc']);
    this.dataService.updateModulesList$.next();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['refresh']) {
          this.dataService.serversideTableRequestData.skip$.next(0);
          this.dataService.serversideTableRequestData.take$.next(25);
        }
      });
  }

  ngOnInit(): void {
    if (this.manageSeo) {
      this.seoAndUtilsService.updateSeo({
        description: 'Eurorack and Intellijel 1U modules database and finder. Filter by function or flavor. Discover new interesting modules.'
      }, this.titleBig);
    }
  }
  
  toggleMobileFilters(): void {
    this.mobileFiltersExpanded = !this.mobileFiltersExpanded;
  }

  setCollectionBrowseMode(mode: RackModuleBrowseMode): void {
    this.hasManualCollectionBrowseModeSelection = true;
    this.applyCollectionBrowseMode(mode);
  }

  isTagSelected(tag: Tag): boolean {
    const selected = this.dataService.fields.tags.control.value ?? [];
    return selected.some((selectedTag) => +selectedTag.id === tag.id);
  }

  selectedTagCount(group: TagSuggestionGroup): number {
    return group.tags.filter(tag => this.isTagSelected(tag)).length;
  }

  get showCollectionBrowseToggle(): boolean {
    return this.enableCollectionBrowseModes && this.ownedModules !== undefined;
  }

  get showAvailableBrowseMode(): boolean {
    return this.currentRackModuleIds.size > 0;
  }

  get showWantedBrowseMode(): boolean {
    return this.wantedModulesCount > 0;
  }

  get ownedModulesCount(): number {
    return this.getOwnedModulesCount(this.ownedModules);
  }

  get wantedModulesCount(): number {
    return this.getWantedModulesCount(this.ownedModules);
  }

  get currentRackModuleCount(): number {
    return this.currentRackModuleIds.size;
  }

  get usesOwnedDataset(): boolean {
    return this.collectionBrowseMode === 'available' || this.collectionBrowseMode === 'owned' || this.collectionBrowseMode === 'wanted';
  }

  get isAvailableBrowseMode(): boolean {
    return this.enableCollectionBrowseModes && this.collectionBrowseMode === 'available';
  }

  get isOwnedBrowseMode(): boolean {
    return this.enableCollectionBrowseModes && this.collectionBrowseMode === 'owned';
  }

  get isWantedBrowseMode(): boolean {
    return this.enableCollectionBrowseModes && this.collectionBrowseMode === 'wanted';
  }

  get browseModeHeading(): string {
    switch (this.collectionBrowseMode) {
      case 'available':
        return 'Available to add';
      case 'owned':
        return 'Your collection';
      case 'wanted':
        return 'Wanted';
      case 'all':
      default:
        return 'All modules';
    }
  }

  get browseModeHint(): string {
    switch (this.collectionBrowseMode) {
      case 'available':
        return 'Owned modules that are not already in this rack.';
      case 'owned':
        return 'All owned modules in your collection, including modules already used in this rack.';
      case 'wanted':
        return 'Modules on your wishlist.';
      case 'all':
      default:
        return 'The full module library, including modules outside your collection.';
    }
  }

  get rackContextEmptyStateCopy(): string {
    if (this.collectionBrowseMode === 'all') {
      return this.dataService.hasActiveModuleFilters()
        ? 'No modules match the current filters. Reset the filters or switch browsing mode.'
        : 'No modules are available right now.';
    }

    if (this.isWantedBrowseMode && this.wantedModulesCount === 0) {
      return 'No wanted modules are available in this view right now.';
    }

    if (!this.isWantedBrowseMode && this.ownedModulesCount === 0) {
      return 'Your collection is empty. Switch to All modules or add some modules to your collection first.';
    }

    if (this.isAvailableBrowseMode && this.availableOwnedModulesCount === 0 && !this.dataService.hasActiveModuleFilters()) {
      return 'Everything from your collection is already in this rack. Switch to Your collection to add duplicates or All modules to browse beyond your collection.';
    }

    if (this.dataService.hasActiveModuleFilters()) {
      if (this.isAvailableBrowseMode) {
        return 'No available collection modules match the current filters. Reset the filters or switch browsing mode.';
      }
      if (this.isWantedBrowseMode) {
        return 'No wanted modules match the current filters. Reset the filters or switch browsing mode.';
      }
      return 'No collection modules match the current filters. Reset the filters or switch browsing mode.';
    }

    if (this.isWantedBrowseMode) {
      return 'No wanted modules are available in this view right now.';
    }

    return this.isAvailableBrowseMode
      ? 'No collection modules are currently available to add to this rack.'
      : 'No modules from your collection are available in this view right now.';
  }

  private applyAdaptiveCollectionBrowseMode(): void {
    if (!this.enableCollectionBrowseModes || this.hasManualCollectionBrowseModeSelection || this.ownedModules === undefined) {
      return;
    }

    const nextMode: RackModuleBrowseMode = this.ownedModulesCount >= this.ownedModulesDefaultThreshold
      ? (this.showAvailableBrowseMode ? 'available' : 'owned')
      : 'all';
    this.applyCollectionBrowseMode(nextMode);
  }

  private applyCollectionBrowseMode(mode: RackModuleBrowseMode): void {
    let nextMode: RackModuleBrowseMode = this.enableCollectionBrowseModes
      ? mode
      : 'all';
    if (nextMode === 'wanted' && !this.showWantedBrowseMode) {
      nextMode = 'owned';
    }

    this.collectionBrowseMode = nextMode;
    if (nextMode === 'available' || nextMode === 'owned' || nextMode === 'wanted') {
      this.dataService.applyOwnedModeDefaultOrder();
    }
    if (nextMode === 'all') {
      this.dataService.fields.order.control.setValue(this.dataService.orderStartingValue, {emitEvent: false});
      this.dataService.serversideTableRequestData.sort$.next([this.dataService.orderStartingValue.id, 'desc']);
    }

    this.dataService.serversideTableRequestData.skip$.next(0);
    if (nextMode === 'all') {
      this.dataService.updateModulesList$.next();
    } else {
      this.syncVisibleModules();
    }
  }

  private syncVisibleModules(): void {
    if (!this.usesOwnedDataset) {
      this.visibleItemsCount$.next(this.dataService.serversideAdditionalData.itemsCount$.value);
      this.updateVisibleModules(this.dataService.modulesList$.value);
      return;
    }

    const filteredUserModules = this.isWantedBrowseMode
      ? this.dataService.filterWantedModules(this.ownedModules)
      : this.dataService.filterOwnedModules(
        this.ownedModules,
        this.isAvailableBrowseMode ? [...this.currentRackModuleIds] : []
      );
    if (filteredUserModules === undefined) {
      this.visibleItemsCount$.next(0);
      this.visibleModules$.next(null);
      return;
    }

    this.visibleItemsCount$.next(filteredUserModules.length);
    this.updateVisibleModules(filteredUserModules);
  }

  private updateVisibleModules(modules: ModuleList): void {
    if (modules === null) {
      if (this.visibleModules$.value === null) {
        return;
      }
      this.visibleModules$.next(null);
      return;
    }

    const currentModules = this.visibleModules$.value;
    if (!this.usesOwnedDataset && this.dataService.fields.order.control.value?.id === 'best-match') {
      const sortedModules = this.dataService.sortModulesByBestMatch(modules);
      if (!this.haveSameModuleIds(currentModules, sortedModules)) {
        this.visibleModules$.next(sortedModules);
      }
      return;
    }

    if (!this.haveSameModuleIds(currentModules, modules)) {
      this.visibleModules$.next(modules);
    }
  }

  private haveSameModuleIds(currentModules: ModuleList, nextModules: ModuleList): boolean {
    if (currentModules === nextModules) {
      return true;
    }
    if (!currentModules || !nextModules || currentModules.length !== nextModules.length) {
      return false;
    }

    return currentModules.every((module, index) => module.id === nextModules[index].id);
  }

  private get availableOwnedModulesCount(): number {
    const ownedModules = this.ownedModules ?? [];
    if (ownedModules.length === 0) {
      return 0;
    }

    return ownedModules.filter((module) =>
      this.dataService.isOwnedPossession(module) && !this.currentRackModuleIds.has(module.id)
    ).length;
  }

  private getOwnedModulesCount(modules: MinimalModule[] | undefined): number {
    return modules?.filter((module) => this.dataService.isOwnedPossession(module)).length ?? 0;
  }

  private getWantedModulesCount(modules: MinimalModule[] | undefined): number {
    return modules?.filter((module) => this.dataService.isWantedPossession(module)).length ?? 0;
  }
}
