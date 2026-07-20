export const DETAIL_ANALYTICS_SURFACES = {
  detailRoute: 'detail_route',
  homePreview: 'home_preview'
} as const;

export type DetailAnalyticsSurface = typeof DETAIL_ANALYTICS_SURFACES[keyof typeof DETAIL_ANALYTICS_SURFACES];

export function shouldCaptureCanonicalDetailView(surface: DetailAnalyticsSurface): boolean {
  return surface === DETAIL_ANALYTICS_SURFACES.detailRoute;
}
