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

export interface ApplicationInsightsHighlight {
  label: string;
  value: string;
  icon: string;
}

export type MetricTone = 'brand' | 'emerald' | 'violet' | 'amber';

export interface ApplicationInsightsSnapshotMetric {
  label: string;
  valueLabel: string;
  detail: string;
  icon: string;
  tone: MetricTone;
}

export interface ApplicationInsightsBar {
  label: string;
  valueLabel: string;
  detail: string;
  widthPercent: number;
  tone: MetricTone;
}

export interface ApplicationInsightsMixSegment {
  label: string;
  valueLabel: string;
  widthPercent: number;
  tone: 'brand' | 'emerald';
}

export interface ApplicationInsightsTrendDay {
  date: string;
  label: string;
  showLabel: boolean;
  total: number;
  heightPercent: number;
  modules: number;
  racks: number;
  patches: number;
}

export interface ApplicationInsightsTrendLegendItem {
  label: string;
  valueLabel: string;
  toneClass: 'modules' | 'racks' | 'patches';
}

export interface ApplicationInsightsTrendMomentumItem {
  label: string;
  valueLabel: string;
  deltaLabel: string;
  toneClass: 'modules' | 'racks' | 'patches';
}

export interface ApplicationInsightsPage {
  heroSummary: string;
  heroHighlights: ApplicationInsightsHighlight[];
  footprintSnapshot: ApplicationInsightsSnapshotMetric[];
  footprintHighlights: ApplicationInsightsHighlight[];
  standardMixBars: ApplicationInsightsBar[];
  standardActivityBars: ApplicationInsightsBar[];
  standardWidthBars: ApplicationInsightsBar[];
  standardManufacturerBars: ApplicationInsightsBar[];
  standardMixHighlights: ApplicationInsightsHighlight[];
  hpBandBars: ApplicationInsightsBar[];
  hpBandActivityBars: ApplicationInsightsBar[];
  hpExactBars: ApplicationInsightsBar[];
  hpBandVelocityBars: ApplicationInsightsBar[];
  hpBandHighlights: ApplicationInsightsHighlight[];
  moduleFreshnessBars: ApplicationInsightsBar[];
  moduleCatalogueAgeBars: ApplicationInsightsBar[];
  moduleFreshnessHighlights: ApplicationInsightsHighlight[];
  topManufacturerBars: ApplicationInsightsBar[];
  activeManufacturerBars: ApplicationInsightsBar[];
  widestManufacturerBars: ApplicationInsightsBar[];
  oneUManufacturerBars: ApplicationInsightsBar[];
  makerHighlights: ApplicationInsightsHighlight[];
  activityChart: {
    days: ApplicationInsightsTrendDay[];
    legend: ApplicationInsightsTrendLegendItem[];
    momentum: ApplicationInsightsTrendMomentumItem[];
    highlights: ApplicationInsightsHighlight[];
  };
  sharingMix: ApplicationInsightsMixSegment[];
  sharingRateBars: ApplicationInsightsBar[];
  sharingHighlights: ApplicationInsightsHighlight[];
  patchDepthBars: ApplicationInsightsBar[];
  patchHighlights: ApplicationInsightsHighlight[];
}
