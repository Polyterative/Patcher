import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  BehaviorSubject,
  of
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  switchMap
} from 'rxjs/operators';
import { ModuleList } from 'src/app/features/module-browser/module-browser-data.service';
import { ManufacturerDetail } from '../../manufacturer-detail-data.service';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { AutoContentLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { ManufacturerUpdatedBadgeComponent } from './manufacturer-updated-badge/manufacturer-updated-badge.component';
import { ModuleRecentMarketPrice } from 'src/app/features/backend/supabase-queries';
import { ManufacturerRowDataService } from './manufacturer-row-data.service';
import {
  AppStateService,
  ModuleListDisplayMode
} from 'src/app/shared-interproject/app-state.service';
import { MinimalModule } from 'src/app/models/module';

export type ManufacturerPanelModuleGroupKind = '3u' | '1u' | 'other';

export interface ManufacturerPanelModuleGroup {
  kind: ManufacturerPanelModuleGroupKind;
  label: string;
  modules: MinimalModule[];
}

function physicalStandardKind(module: MinimalModule): ManufacturerPanelModuleGroupKind {
  switch (module.standard?.id) {
    case 0:
      return '3u';
    case 1:
    case 2:
      return '1u';
    default:
      return 'other';
  }
}

export function groupModulesByPhysicalStandard(
  modules: ReadonlyArray<MinimalModule>
): ManufacturerPanelModuleGroup[] {
  const groups: Record<ManufacturerPanelModuleGroupKind, ManufacturerPanelModuleGroup> = {
    '3u': { kind: '3u', label: '3U', modules: [] },
    '1u': { kind: '1u', label: '1U', modules: [] },
    other: { kind: 'other', label: 'Other', modules: [] },
  };

  for (const module of modules) {
    groups[physicalStandardKind(module)].modules.push(module);
  }

  return [groups['3u'], groups['1u'], groups.other]
    .filter(group => group.modules.length > 0);
}


@Component({
  selector: 'app-manufacturer-row',
  templateUrl: './manufacturer-row.component.html',
  styleUrls: ['./manufacturer-row.component.scss'],
  providers: [ManufacturerRowDataService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AutoContentLoadingIndicatorComponent,
    CleanCardComponent,
    ModulePartsModule,
    ManufacturerUpdatedBadgeComponent
  ]
})
export class ManufacturerRowComponent extends SubManager implements OnInit {
  @Input() manufacturer!: ManufacturerDetail;
  @Input() hideRowLink = false;
  @Input() showPriceSummary = false;
  @Input() displayMode: ModuleListDisplayMode | null = null;
  /** When true, always render the compact list layout and ignore the global
   * List/Panels preference from AppStateService. Used when this row is embedded
   * in a small context (e.g. the module detail page's "same manufacturer" panel)
   * where the full-size panel layout doesn't fit and there's no toggle to switch it. */
  @Input() forceListMode = false;

  get logoStorageBase(): string {
    return this.dataService.logoStorageBase;
  }

  private readonly _modules$ = new BehaviorSubject<ModuleList>(null);
  readonly modules$ = this._modules$.asObservable();
  readonly panelModuleGroups$ = this.modules$.pipe(
    map(modules => modules === null ? null : groupModulesByPhysicalStandard(modules))
  );
  private readonly _priceSummaryByModuleId$ = new BehaviorSubject<ReadonlyMap<number, ModuleRecentMarketPrice>>(new Map());
  readonly priceSummaryByModuleId$ = this._priceSummaryByModuleId$.asObservable();

  readonly moduleViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideButtons: true,
    hideDates: true,
    hideDescription: true,
    hideManufacturer: true,
    hideLabels: true,
    hideTags: true,
    hidePatchedIn: true,
    hideRackedIn: true,
    hideBySameManufacturer: true,
    ellipseDescription: true,
    tagsReadOnly: true,
    tagsShowCounts: false,
    tagsMaxCount: 0,
  };
  
  constructor(
    private readonly dataService: ManufacturerRowDataService,
    public readonly appState: AppStateService
  ) {
    super();
  }

  ngOnInit(): void {
    this.dataService.modulesBySameManufacturer(this.manufacturer.id)
      .pipe(this.takeUntilDestroyed())
      .subscribe(modules => this._modules$.next(modules ?? []));

    if (!this.showPriceSummary || !this.dataService.canLoadRecentModuleMarketPrices) {
      return;
    }

    this.modules$.pipe(
      filter((modules): modules is NonNullable<ModuleList> => Array.isArray(modules)),
      map(modules => this.getSortedModuleIds(modules)),
      distinctUntilChanged((first, second) => first.join(',') === second.join(',')),
      switchMap(moduleIds => {
        if (moduleIds.length === 0) {
          return of([]);
        }

        return this.dataService.recentModuleMarketPrices(moduleIds).pipe(
          catchError(error => {
            console.warn('Recent market prices could not be loaded for manufacturer row.', error);
            return of([]);
          })
        );
      }),
      this.takeUntilDestroyed()
    ).subscribe(summaries => {
      this._priceSummaryByModuleId$.next(new Map(summaries.map(summary => [summary.moduleId, summary])));
    });
  }

  private getSortedModuleIds(data: ReadonlyArray<{ id: number }>): number[] {
    return [...new Set(
      data
        .map(module => module.id)
        .filter(id => Number.isFinite(id) && id > 0)
    )].sort((first, second) => first - second);
  }
}
