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
  freshness: ApplicationInsightStatistic[];
  catalogueHealth: ApplicationInsightStatistic[];
  sharing: ApplicationInsightStatistic[];
  participation: ApplicationInsightStatistic[];
  patchNetwork: ApplicationInsightStatistic[];
  sharingMix: ApplicationInsightStatistic[];
  derived: ApplicationInsightStatistic[];
  coverage: {
    title: string;
    description: string;
  }[];
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
    const sharedWorks = statistics.publicRacks + statistics.publicPatches;
    const recentSharedWorks = statistics.publicRacksUpdatedLast30Days + statistics.publicPatchesUpdatedLast30Days;
    const roundRatio = (numerator: number, denominator: number): number =>
      denominator > 0 ? Math.round(numerator / denominator) : 0;
    const buildSignalStatistic = (
      name: string,
      numerator: number,
      denominator: number,
      icon: string,
      scale = 1,
      minimumNumerator = 3,
      minimumDenominator = 3
    ): ApplicationInsightStatistic | null => {
      if (numerator < minimumNumerator || denominator < minimumDenominator) {
        return null;
      }
      return {
        name,
        value: roundRatio(numerator * scale, denominator),
        icon
      };
    };
    const catalogueHealth = [
      buildSignalStatistic('Shared racks per 100 modules', statistics.publicRacks, statistics.publicModules, 'monitoring', 100, 5, 25),
      buildSignalStatistic('Shared patches per 100 modules', statistics.publicPatches, statistics.publicModules, 'insights', 100, 5, 25),
      buildSignalStatistic('Shared works per represented maker', sharedWorks, statistics.publicManufacturers, 'hub', 1, 5, 3)
    ].filter((value): value is ApplicationInsightStatistic => !!value);
    const sharingMix = sharedWorks >= 10
      ? [
        {
          name: 'Shared works total',
          value: sharedWorks,
          icon: 'layers'
        },
        buildSignalStatistic('Racks share of shared works', statistics.publicRacks, sharedWorks, 'space_dashboard', 100, 3, 6),
        buildSignalStatistic('Patches share of shared works', statistics.publicPatches, sharedWorks, 'cable', 100, 3, 6)
      ].filter((value): value is ApplicationInsightStatistic => !!value)
      : [];
    const derived = [
      buildSignalStatistic('Modules per represented maker', statistics.publicModules, statistics.publicManufacturers, 'rule'),
      buildSignalStatistic('Racks per sharing profile', statistics.publicRacks, statistics.publicRackAuthors, 'splitscreen'),
      buildSignalStatistic('Patches per sharing profile', statistics.publicPatches, statistics.publicPatchAuthors, 'linear_scale')
    ].filter((value): value is ApplicationInsightStatistic => !!value);
    const participation = [
      {
        name: 'Public profiles',
        value: statistics.publicProfiles,
        icon: 'person_search'
      },
      buildSignalStatistic('Rack-sharing profiles per 100 public profiles', statistics.publicRackAuthors, statistics.publicProfiles, 'dashboard_customize', 100, 3, 10),
      buildSignalStatistic('Patch-sharing profiles per 100 public profiles', statistics.publicPatchAuthors, statistics.publicProfiles, 'hub', 100, 3, 10)
    ].filter((value): value is ApplicationInsightStatistic => !!value);
    const freshness = [
      {
        name: 'Public modules updated last 30 days',
        value: statistics.publicModulesUpdatedLast30Days,
        icon: 'schedule'
      },
      {
        name: 'Shared racks updated last 30 days',
        value: statistics.publicRacksUpdatedLast30Days,
        icon: 'space_dashboard'
      },
      {
        name: 'Shared patches updated last 30 days',
        value: statistics.publicPatchesUpdatedLast30Days,
        icon: 'cable'
      },
      buildSignalStatistic('Modules updated last 30 days per 100 public modules', statistics.publicModulesUpdatedLast30Days, statistics.publicModules, 'monitoring', 100, 5, 25),
      buildSignalStatistic('Shared works updated last 30 days per 100 shared works', recentSharedWorks, sharedWorks, 'timelapse', 100, 5, 10)
    ].filter((value): value is ApplicationInsightStatistic => !!value);
    const patchNetwork = [
      ...(statistics.publicPatchConnections > 0
        ? [{
          name: 'Saved connections total',
          value: statistics.publicPatchConnections,
          icon: 'linear_scale'
        }]
        : []),
      buildSignalStatistic('Saved connections per shared patch', statistics.publicPatchConnections, statistics.publicPatches, 'share', 1, 12, 5),
      buildSignalStatistic('Saved connections per patch-sharing profile', statistics.publicPatchConnections, statistics.publicPatchAuthors, 'hub', 1, 12, 3)
    ].filter((value): value is ApplicationInsightStatistic => !!value);

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
      freshness,
      catalogueHealth,
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
      participation,
      patchNetwork,
      sharingMix,
      derived,
      coverage: [
        {
          title: catalogueHealth.length > 0 ? 'Catalogue health is live' : 'Catalogue health is currently suppressed',
          description: catalogueHealth.length > 0
            ? 'Normalized catalogue-health signals are visible because the public library has at least 25 public modules and enough shared work to scale those ratios responsibly.'
            : 'Catalogue-health ratios stay hidden until the public library reaches at least 25 public modules plus enough shared work to normalize the signal without over-reading a tiny sample.'
        },
        {
          title: sharingMix.length > 0 ? 'Sharing mix is live' : 'Sharing mix is currently suppressed',
          description: sharingMix.length > 0
            ? 'The rack/patch composition card is visible because there are at least 10 public shared works to describe as a meaningful split.'
            : 'The rack/patch composition card stays hidden until there are at least 10 public shared works to describe as more than a tiny-sample split.'
        },
        {
          title: derived.length > 0 ? 'Derived ratios are live' : 'Derived ratios are currently suppressed',
          description: derived.length > 0
            ? 'Rounded derived ratios are visible because both sides of each comparison clear the minimum counts needed to read them directionally.'
            : 'Derived ratios stay hidden whenever either side of a comparison is too sparse, so the page does not imply a fake KPI from only a handful of public items.'
        },
        {
          title: participation.length > 1 ? 'Participation rates are live' : 'Participation rates are currently suppressed',
          description: participation.length > 1
            ? 'The page can show rack- and patch-sharing participation per 100 public profiles because the public profile base is large enough to support a meaningful rate.'
            : 'Participation rates stay hidden until there are enough public profiles and enough sharing authors to describe adoption as a rate instead of a tiny-sample anecdote.'
        },
        {
          title: freshness.length > 3 ? 'Freshness rates are live' : 'Freshness rates are currently suppressed',
          description: freshness.length > 3
            ? 'Recent-activity rates are visible because there is enough public footprint and enough last-30-day movement to normalize freshness instead of leaving it as raw counts alone.'
            : 'Freshness rates stay hidden until there is enough public footprint and enough recent movement to read 30-day activity as a directional rate instead of a tiny-sample burst.'
        },
        {
          title: patchNetwork.length > 1 ? 'Patch-network rates are live' : 'Patch-network rates are currently suppressed',
          description: patchNetwork.length > 1
            ? 'Patch-network density signals are visible because there are enough saved public connections to describe how interconnected shared patches are without over-reading only a few cables.'
            : 'Patch-network rates stay hidden until there are enough saved public connections and connected public patches to read the average as a directional pattern instead of a tiny-sample curiosity.'
        }
      ],
      interpretation: creatorFootprint > 0
        ? 'The catalogue is now broad enough to support a lightweight public intelligence layer: not just what exists, but how much real shared work is accumulating around it. Freshness counts, normalized freshness rates, coverage rates, patch-network density, and rounded ratios help show shape without pretending to be exact analytics.'
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
          icon: 'monitoring',
          title: 'Coverage rates are normalized',
          description: 'Where a tiny raw ratio would read poorly, this page scales the signal to a clearer baseline such as shared racks or patches per 100 public modules.'
        },
        {
          icon: 'pie_chart',
          title: 'Mix signals describe composition',
          description: 'Where this page shows split percentages, they describe how the current public work is divided between racks and patches. They are composition signals, not popularity rankings.'
        },
        {
          icon: 'functions',
          title: 'Derived signals stay rounded',
          description: 'Any ratio-style numbers on this page are rounded to whole numbers, and low-volume ratios stay hidden until the public sample is large enough to read as a directional signal instead of a fake KPI.'
        },
        {
          icon: 'share',
          title: 'Patch-network signals stay aggregate',
          description: 'Patch-network blocks count saved cable connections only in aggregate across public patches from public profiles. They describe density, not any specific patch graph.'
        },
        {
          icon: 'schedule',
          title: 'Freshness uses recent updates',
          description: 'Freshness counts use trailing 30-day `updated` activity on public modules, racks, and connected patches. They describe recent movement, not publication order or long-term trends.'
        },
        {
          icon: 'timelapse',
          title: 'Freshness rates are normalized',
          description: 'Where recent-update counts would be hard to compare across a growing library, this page can scale them per 100 public modules or shared works once the sample is large enough to support a directional rate.'
        }
      ]
    };
  }
}
