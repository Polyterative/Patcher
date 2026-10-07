import { of, ReplaySubject, throwError } from 'rxjs';
import { PublicApplicationStatistics } from 'src/app/features/backend/supabase-queries.models';
import type { SupabaseService } from 'src/app/features/backend/supabase.service';
import type { AnalyticsService } from '../analytics-integration/analytics.service';
import type { UserManagementService } from '../login/user-management.service';
import { HomeDataService, mapHomeProofFigures } from './home-data.service';

const BASE_STATS: PublicApplicationStatistics = {
  publicModules: 10178,
  publicManufacturers: 752,
  publicProfiles: 300,
  publicModulesUpdatedLast30Days: 40,
  publicRacks: 456,
  publicRackAuthors: 120,
  publicRacksUpdatedLast30Days: 10,
  publicPatches: 39,
  publicPatchConnections: 400,
  publicPatchAuthors: 20,
  publicPatchesUpdatedLast30Days: 2
};

describe('mapHomeProofFigures', () => {
  it('formats modules, manufacturers and shared racks', () => {
    expect(mapHomeProofFigures(BASE_STATS)).toEqual([
      {value: '10,178', label: 'modules in the catalogue'},
      {value: '752', label: 'manufacturers'},
      {value: '456', label: 'racks shared'}
    ]);
  });

  it('prefers the total rack footprint when the RPC exposes it', () => {
    const figures = mapHomeProofFigures({...BASE_STATS, totalRacks: 3120});
    expect(figures[2]).toEqual({value: '3,120', label: 'racks planned'});
  });

  it('drops zero counts and handles a missing payload', () => {
    expect(mapHomeProofFigures({...BASE_STATS, publicManufacturers: 0}).map(f => f.label))
      .toEqual(['modules in the catalogue', 'racks shared']);
    expect(mapHomeProofFigures(null)).toEqual([]);
  });
});

describe('HomeDataService', () => {
  let analytics: jasmine.SpyObj<AnalyticsService>;
  let loggedUser$: ReplaySubject<unknown>;

  function makeService(statistics$ = of(BASE_STATS)) {
    const backend = {GET: {applicationStatistics: () => statistics$}} as unknown as SupabaseService;
    const users = {loggedUser$} as unknown as UserManagementService;
    return new HomeDataService(backend, users, analytics);
  }

  beforeEach(() => {
    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture']);
    loggedUser$ = new ReplaySubject(1);
  });

  it('reports signed-out first, then follows the session', () => {
    const service = makeService();
    const values: boolean[] = [];
    service.isSignedIn$.subscribe(value => values.push(value));

    loggedUser$.next(undefined);
    loggedUser$.next({id: 'u1'});

    expect(values).toEqual([false, true]);
    service.ngOnDestroy();
  });

  it('falls back to no figures when statistics fail', () => {
    const service = makeService(throwError(() => new Error('down')));
    let figures: unknown;
    service.proofFigures$.subscribe(value => (figures = value));
    expect(figures).toEqual([]);
    service.ngOnDestroy();
  });

  it('captures every homepage CTA click', () => {
    const service = makeService();
    service.ctaClicked$.next({cta: 'signup', location: 'hero'});
    expect(analytics.capture).toHaveBeenCalledWith('home.cta_clicked', {cta: 'signup', location: 'hero'});
    service.ngOnDestroy();
  });

  it('keeps the insights entry funnel event for the insights link', () => {
    const service = makeService();
    service.ctaClicked$.next({cta: 'insights', location: 'proof'});
    expect(analytics.capture).toHaveBeenCalledWith('insights.entry_clicked', {source: 'home_proof'});
    service.ngOnDestroy();
  });
});
