import { Injectable } from '@angular/core';
import {
  Observable,
  Subject,
  catchError,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  startWith
} from 'rxjs';
import { tap } from 'rxjs/operators';
import { PublicApplicationStatistics } from 'src/app/features/backend/supabase-queries.models';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { AnalyticsService } from '../analytics-integration/analytics.service';
import { UserManagementService } from '../login/user-management.service';
import { HomeCtaClick, HomeProofFigure } from './home-content.models';

const numberFormat = new Intl.NumberFormat('en-US');

/** Live figures for the proof strip; zero or missing counts are dropped rather than shown as "0". */
export function mapHomeProofFigures(statistics: PublicApplicationStatistics | null): HomeProofFigure[] {
  if (!statistics) {
    return [];
  }

  const racks = statistics.totalRacks ?? statistics.publicRacks;
  const figures: HomeProofFigure[] = [
    {value: statistics.publicModules, label: 'modules in the catalogue'},
    {value: statistics.publicManufacturers, label: 'manufacturers'},
    {value: racks, label: statistics.totalRacks != null ? 'racks planned' : 'racks shared'}
  ]
    .filter(({value}) => Number.isFinite(value) && value > 0)
    .map(({value, label}) => ({value: numberFormat.format(value), label}));

  return figures;
}

@Injectable()
export class HomeDataService extends SubManager {
  readonly ctaClicked$ = new Subject<HomeCtaClick>();

  readonly isSignedIn$: Observable<boolean>;
  readonly proofFigures$: Observable<HomeProofFigure[]>;

  constructor(
    private readonly backend: SupabaseService,
    private readonly userService: UserManagementService,
    private readonly analytics: AnalyticsService
  ) {
    super();

    this.isSignedIn$ = this.userService.loggedUser$.pipe(
      map(user => !!user),
      startWith(false),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );

    this.proofFigures$ = this.backend.GET.applicationStatistics().pipe(
      map(statistics => mapHomeProofFigures(statistics)),
      catchError(() => of([])),
      shareReplay({bufferSize: 1, refCount: true})
    );

    this.ctaClicked$
      .pipe(
        tap(({cta, location}) => {
          this.analytics.capture('home.cta_clicked', {cta, location});
          if (cta === 'insights') {
            // Keeps the existing insights-entry funnel continuous across the redesign.
            this.analytics.capture('insights.entry_clicked', {source: `home_${location}`});
          }
        }),
        this.takeUntilDestroyed()
      )
      .subscribe();
  }
}
