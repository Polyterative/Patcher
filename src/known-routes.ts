/**
 * Known Angular application routes, shared by the SSR server (src/server.ts)
 * and the bot-metadata edge middleware (middleware.ts). Keep this file free of
 * imports so both can bundle it standalone.
 */
export interface KnownRouteFeatures {
  collectionsEnabled: boolean;
  marketplaceEnabled: boolean;
}

export function getKnownApplicationRoutePatterns(features: KnownRouteFeatures): RegExp[] {
  const routePatterns = [
    /^\/$/,
    /^\/home\/?$/,
    /^\/admin\/?$/,
    /^\/auth\/(?:login|signup|reset-password|callback|complete-profile)\/?$/,
    /^\/u\/[^/]+\/?$/,
    /^\/user\/account\/?$/,
    /^\/user\/area\/?$/,
    /^\/racks(?:\/browser|\/details\/\d+|\/[^/]+)?\/?$/,
    /^\/patches(?:\/browser|\/details\/\d+|\/[^/]+)?\/?$/,
    /^\/modules(?:\/browser|\/details\/\d+|\/add)?\/?$/,
    /^\/manufacturers(?:\/browser|\/details\/\d+)?\/?$/,
    /^\/info\/(?:changelog|insights)\/?$/,
    /^\/links\/retired\/?$/,
    /^\/404\/?$/,
  ];

  if (features.collectionsEnabled) {
    routePatterns.push(
      /^\/collections(?:\/browser|\/manage\/[^/]+|\/[^/]+)?\/?$/,
      /^\/collection\/[^/]+\/?$/,
    );
  }

  if (features.marketplaceEnabled) {
    routePatterns.push(/^\/marketplace(?:\/[^/]+)?\/?$/);
  }

  return routePatterns;
}

export function isKnownApplicationRoute(pathname: string, features: KnownRouteFeatures): boolean {
  return getKnownApplicationRoutePatterns(features).some(pattern => pattern.test(pathname));
}
