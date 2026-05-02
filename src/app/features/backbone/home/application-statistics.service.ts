import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import {
  map,
  switchMap
} from 'rxjs/operators';
import { SupabaseService } from '../../backend/supabase.service';
import { PublicApplicationStatistics } from '../../backend/supabase-queries';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


export interface ApplicationInsightsTeaser {
  interpretation: string;
  methodology: string;
  emptyMessage: string;
  statistics: ApplicationInsightStatistic[];
}

export interface ApplicationInsightStatistic {
  name: string;
  value: number;
  icon: string;
}

export interface ApplicationInsightsPage {
  interpretation: string;
  overview: ApplicationInsightStatistic[];
  sharing: ApplicationInsightStatistic[];
  derived: ApplicationInsightStatistic[];
  methodology: {
    icon: string;
    title: string;
    description: string;
  }[];
}

@Injectable()
export class ApplicationStatisticsService extends SubManager {
  private readonly refreshRequest$ = new ReplaySubject<void>(1);

  readonly teaser$ = this.refreshRequest$.pipe(
    switchMap(() => this.backend.GET.applicationStatistics()),
    map((statistics) => this.mapTeaser(statistics))
  );
  readonly page$ = this.refreshRequest$.pipe(
    switchMap(() => this.backend.GET.applicationStatistics()),
    map((statistics) => this.mapPage(statistics))
  );

  constructor(
    private readonly backend: SupabaseService
  ) {
    super();
    this.refreshRequest$.next();
  }

  refresh() {
    this.refreshRequest$.next();
  }

  private mapTeaser(statistics: PublicApplicationStatistics): ApplicationInsightsTeaser {
    const sharedWorkExists = statistics.publicRacks > 0 || statistics.publicPatches > 0;

    return {
      statistics: [
        {
          name: 'Public modules',
          value: statistics.publicModules,
          icon: 'view_module',
        },
        {
          name: 'Shared racks',
          value: statistics.publicRacks,
          icon: 'space_dashboard',
        },
        {
          name: 'Shared patches',
          value: statistics.publicPatches,
          icon: 'cable',
        }
      ],
      interpretation: sharedWorkExists
        ? 'The public library already includes enough real racks and patches to explore patterns, not just static catalogue pages.'
        : 'The public catalogue is live, and this teaser will deepen as more people publish racks and patches from public profiles.',
      methodology: 'Aggregate only. Rack and patch counts include only public items from public profiles, and patch totals follow the public patch browser by counting shared patches with saved cable connections.',
      emptyMessage: 'Public insight snapshots will appear here once enough public catalogue activity is available.'
    };
  }

  private mapPage(statistics: PublicApplicationStatistics): ApplicationInsightsPage {
    const creatorFootprint = statistics.publicRackAuthors + statistics.publicPatchAuthors;
    const roundRatio = (numerator: number, denominator: number): number =>
      denominator > 0 ? Math.round(numerator / denominator) : 0;

    return {
      overview: [
        {
          name: 'Public modules',
          value: statistics.publicModules,
          icon: 'view_module'
        },
        {
          name: 'Manufacturers represented',
          value: statistics.publicManufacturers,
          icon: 'precision_manufacturing'
        },
        {
          name: 'Shared racks',
          value: statistics.publicRacks,
          icon: 'space_dashboard'
        },
        {
          name: 'Shared patches',
          value: statistics.publicPatches,
          icon: 'cable'
        }
      ],
      sharing: [
        {
          name: 'Profiles sharing racks',
          value: statistics.publicRackAuthors,
          icon: 'dashboard_customize'
        },
        {
          name: 'Profiles sharing patches',
          value: statistics.publicPatchAuthors,
          icon: 'hub'
        }
      ],
      derived: [
        {
          name: 'Modules per represented maker',
          value: roundRatio(statistics.publicModules, statistics.publicManufacturers),
          icon: 'rule'
        },
        {
          name: 'Racks per sharing profile',
          value: roundRatio(statistics.publicRacks, statistics.publicRackAuthors),
          icon: 'splitscreen'
        },
        {
          name: 'Patches per sharing profile',
          value: roundRatio(statistics.publicPatches, statistics.publicPatchAuthors),
          icon: 'linear_scale'
        }
      ],
      interpretation: creatorFootprint > 0
        ? 'The catalogue is now broad enough to support a lightweight public intelligence layer: not just what exists, but how much real shared work is accumulating around it. Rounded ratios help show shape without pretending to be exact analytics.'
        : 'The catalogue footprint is already meaningful, while the public sharing layer is still early enough that methodology matters more than dashboard density.',
      methodology: [
        {
          icon: 'shield',
          title: 'Public-safe only',
          description: 'Everything on this page is aggregate-only. No private racks, private patches, or hidden profiles are counted.'
        },
        {
          icon: 'cable',
          title: 'Patch counts stay strict',
          description: 'Patch totals follow the public patch browser and count only public patches with saved cable connections from public profiles.'
        },
        {
          icon: 'visibility',
          title: 'Profile visibility still gates sharing',
          description: 'Rack and patch sharing metrics only include content from profiles that are themselves public, so profile privacy remains the top-level boundary.'
        },
        {
          icon: 'functions',
          title: 'Derived signals stay rounded',
          description: 'Any ratio-style numbers on this page are rounded to whole numbers and meant as directional signals, not precise operational KPIs.'
        }
      ]
    };
  }
}
