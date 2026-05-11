import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnInit,
  ViewChild
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  BehaviorSubject,
  merge,
  Observable
} from 'rxjs';
import {
  startWith,
  skip,
  switchMap,
  take,
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
import {
  MatPaginator,
  PageEvent
} from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';
import {
  MinimalModule,
  RackedModule
} from 'src/app/models/module';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ModuleList } from '../module-browser-data.service';


type RackModuleBrowseMode = 'available' | 'owned' | 'all';
const OWNED_MODULES_DEFAULT_THRESHOLD = 20;

@Component({
  selector: 'app-module-browser-root',
  templateUrl: './module-browser-root.component.html',
  styleUrls: ['./module-browser-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ModuleBrowserRecentActivityService],
  standalone: false
})
export class ModuleBrowserRootComponent extends SubManager implements OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  private readonly document = inject(DOCUMENT);
  @Input() showSubmitFab = true;
  @Input() compactSidebarAtTablet = false;
  @Input() titleBig = 'Modules';
  @Input() description = 'Browse and discover modules, save your favourites and submit your own';
  @Input() showRecentActivity = true;
  @Input() manageSeo = true;
  mobileFiltersExpanded = false;
  readonly recentActivityItems$: Observable<RecentActivityItem[]>;
  readonly visibleModules$ = new BehaviorSubject<ModuleList>(null);
  readonly visibleItemsCount$ = new BehaviorSubject<number>(0);
  readonly ownedModulesDefaultThreshold = OWNED_MODULES_DEFAULT_THRESHOLD;
  collectionBrowseMode: RackModuleBrowseMode = 'all';

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
      this.dataService.fields.order.control.valueChanges
    )
      .pipe(
        startWith(null),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.syncVisibleModules());

    this.dataService.paginatorToFistPage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.paginator?.firstPage());
    
    this.dataService.pageEvent$
      .pipe(
        switchMap(() => this.dataService.modulesList$.pipe(
          skip(1),
          take(1)
        )),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.document.defaultView?.scrollTo({top: 0, behavior: 'smooth'}));
    
    this.dataService.fields.order.control.patchValue(this.dataService.orderStartingValue, {emitEvent: false});
    this.dataService.serversideTableRequestData.sort$.next([this.dataService.orderStartingValue.id, 'desc']);
    this.dataService.updateModulesList$.next();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['refresh']) {
          this.dataService.serversideTableRequestData.skip$.next(0);
          this.dataService.serversideTableRequestData.take$.next(20);
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

  handlePageEvent(event: PageEvent): void {
    if (this.usesOwnedDataset) {
      this.dataService.serversideTableRequestData.take$.next(event.pageSize);
      this.dataService.serversideTableRequestData.skip$.next(event.pageIndex * event.pageSize);
      this.syncVisibleModules();
      this.document.defaultView?.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }

    this.dataService.pageEvent$.next(event);
  }

  get showCollectionBrowseToggle(): boolean {
    return this.enableCollectionBrowseModes && this.ownedModules !== undefined;
  }

  get showAvailableBrowseMode(): boolean {
    return this.currentRackModuleIds.size > 0;
  }

  get ownedModulesCount(): number {
    return this.ownedModules?.length ?? 0;
  }

  get currentRackModuleCount(): number {
    return this.currentRackModuleIds.size;
  }

  get usesOwnedDataset(): boolean {
    return this.collectionBrowseMode === 'available' || this.collectionBrowseMode === 'owned';
  }

  get isAvailableBrowseMode(): boolean {
    return this.enableCollectionBrowseModes && this.collectionBrowseMode === 'available';
  }

  get isOwnedBrowseMode(): boolean {
    return this.enableCollectionBrowseModes && this.collectionBrowseMode === 'owned';
  }

  get browseModeHeading(): string {
    switch (this.collectionBrowseMode) {
      case 'available':
        return 'Available to add';
      case 'owned':
        return 'Your collection';
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
        return 'Everything in your collection, including modules already used in this rack.';
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

    if ((this.ownedModules?.length ?? 0) === 0) {
      return 'Your collection is empty. Switch to All modules or add some modules to your collection first.';
    }

    if (this.isAvailableBrowseMode && this.availableOwnedModulesCount === 0 && !this.dataService.hasActiveModuleFilters()) {
      return 'Everything from your collection is already in this rack. Switch to Your collection to add duplicates or All modules to browse beyond your collection.';
    }

    if (this.dataService.hasActiveModuleFilters()) {
      return this.isAvailableBrowseMode
        ? 'No available collection modules match the current filters. Reset the filters or switch browsing mode.'
        : 'No collection modules match the current filters. Reset the filters or switch browsing mode.';
    }

    return this.isAvailableBrowseMode
      ? 'No collection modules are currently available to add to this rack.'
      : 'No modules from your collection are available in this view right now.';
  }

  get visibleResultsMeta(): string {
    const visibleCount = this.visibleItemsCount$.value;
    const resultLabel = visibleCount === 1 ? 'result' : 'results';
    return `${ visibleCount } ${ resultLabel }`;
  }

  private applyAdaptiveCollectionBrowseMode(): void {
    if (!this.enableCollectionBrowseModes || this.hasManualCollectionBrowseModeSelection || this.ownedModules === undefined) {
      return;
    }

    const nextMode: RackModuleBrowseMode = this.ownedModules.length >= this.ownedModulesDefaultThreshold
      ? (this.showAvailableBrowseMode ? 'available' : 'owned')
      : 'all';
    this.applyCollectionBrowseMode(nextMode);
  }

  private applyCollectionBrowseMode(mode: RackModuleBrowseMode): void {
    const nextMode: RackModuleBrowseMode = this.enableCollectionBrowseModes
      ? mode
      : 'all';

    this.collectionBrowseMode = nextMode;
    if (nextMode === 'available' || nextMode === 'owned') {
      this.dataService.applyOwnedModeDefaultOrder();
    }
    if (nextMode === 'all') {
      this.dataService.fields.order.control.setValue(this.dataService.orderStartingValue, {emitEvent: false});
      this.dataService.serversideTableRequestData.sort$.next([this.dataService.orderStartingValue.id, 'desc']);
    }

    this.dataService.serversideTableRequestData.skip$.next(0);
    this.dataService.paginatorToFistPage$.next();
    if (nextMode === 'all') {
      this.dataService.updateModulesList$.next();
    } else {
      this.syncVisibleModules();
    }
  }

  private syncVisibleModules(): void {
    if (!this.usesOwnedDataset) {
      this.visibleItemsCount$.next(this.dataService.serversideAdditionalData.itemsCount$.value);
      this.visibleModules$.next(this.dataService.modulesList$.value);
      return;
    }

    const filteredOwnedModules = this.dataService.filterOwnedModules(
      this.ownedModules,
      this.isAvailableBrowseMode ? [...this.currentRackModuleIds] : []
    );
    if (filteredOwnedModules === undefined) {
      this.visibleItemsCount$.next(0);
      this.visibleModules$.next(null);
      return;
    }

    const skip = this.dataService.serversideTableRequestData.skip$.value;
    const take = this.dataService.serversideTableRequestData.take$.value;
    this.visibleItemsCount$.next(filteredOwnedModules.length);
    this.visibleModules$.next(filteredOwnedModules.slice(skip, skip + take));
  }

  private get availableOwnedModulesCount(): number {
    const ownedModules = this.ownedModules ?? [];
    if (ownedModules.length === 0) {
      return 0;
    }

    return ownedModules.filter((module) => !this.currentRackModuleIds.has(module.id)).length;
  }
}
