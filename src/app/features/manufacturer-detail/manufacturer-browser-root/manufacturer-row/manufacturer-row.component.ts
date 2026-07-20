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

  get logoStorageBase(): string {
    return this.dataService.logoStorageBase;
  }

  private readonly _modules$ = new BehaviorSubject<ModuleList>(null);
  readonly modules$ = this._modules$.asObservable();
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
  
  constructor(private readonly dataService: ManufacturerRowDataService) {
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
