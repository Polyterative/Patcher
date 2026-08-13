import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import type { SupabaseService } from '../../features/backend/supabase.service';
import { UserManagementService } from '../../features/backbone/login/user-management.service';
import { AnalyticsService } from '../../features/backbone/analytics-integration/analytics.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DbModule } from '../../models/module';
import { PatchMinimal } from '../../models/patch';
import { RackMinimal } from '../../models/rack';
import { ModuleCollectionSummary } from '../../models/module-collection';
import { ModulePriceHistorySnapshot, ModulePriceListing } from 'src/app/features/backend/supabase-queries';
import { UserModuleAcquisition } from 'src/app/models/user-module-acquisition';
import { ModulePossessionCounts, ModuleUsageSummary } from './module-detail-data.models';
import { DetailAnalyticsSurface } from '../detail-analytics-surface';

/** Narrow view of ModuleDetailDataService consumed by the updateSingleModuleData$-triggered data-loading pipelines. */
export interface ModuleDetailDataLoadingContext {
  readonly destroy$: Observable<void>;
  readonly collectionsEnabled: boolean;
  readonly coolReactionsEnabled: boolean;
  readonly backend: SupabaseService;
  readonly userService: UserManagementService;
  readonly analytics: AnalyticsService;
  readonly snackBar: MatSnackBar;
  readonly updateSingleModuleData$: ReplaySubject<number>;
  readonly detailAnalyticsSurface$: BehaviorSubject<DetailAnalyticsSurface>;
  readonly singleModuleData$: BehaviorSubject<DbModule | null>;
  readonly moduleEditorHasPendingChanges$: BehaviorSubject<boolean>;
  readonly racksWithThisModule$: BehaviorSubject<RackMinimal[] | undefined>;
  readonly patchesWithThisModule$: BehaviorSubject<PatchMinimal[] | undefined>;
  readonly collectionsWithThisModule$: BehaviorSubject<ModuleCollectionSummary[] | undefined>;
  readonly modulePriceListings$: BehaviorSubject<ModulePriceListing[] | undefined>;
  readonly modulePriceHistorySnapshots$: BehaviorSubject<ModulePriceHistorySnapshot[] | undefined>;
  readonly moduleUsageSummary$: BehaviorSubject<ModuleUsageSummary | undefined>;
  readonly possessionCounts$: BehaviorSubject<ModulePossessionCounts | undefined>;
  readonly coolCount$: BehaviorSubject<number | undefined>;
  readonly coolCountUpdate$: Observable<number | null>;
  readonly userModuleAcquisitions$: BehaviorSubject<UserModuleAcquisition[] | undefined>;
}
