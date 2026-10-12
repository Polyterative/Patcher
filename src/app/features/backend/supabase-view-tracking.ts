/** One view as sent to `public.track_views` (see migration 20261012120000_add_entity_view_tracking). */
export interface TrackedViewPayload {
  /** Entity type code: 1 module, 2 rack, 3 patch, 4 manufacturer, 5 collection, 9 page. */
  t: number;
  id?: number;
  /** Route template for pages, e.g. `modules/details/:id`. */
  r?: string;
  /** 0 direct, 1 internal navigation, 2 search engine, 3 other external site. */
  s: number;
}

/** `missing` = the RPC is not deployed (or was revoked as the kill switch). */
export type TrackViewsResult = 'ok' | 'missing' | 'error';

/**
 * Write path for first-party view tracking. Uses a raw `fetch` instead of supabase-js so
 * the request can use `keepalive` and survive `pagehide`.
 */
export function createViewTrackingNamespace(
  url: string,
  anonKey: string,
  getAccessToken: () => string | null
) {
  return {
    track: (visitor: string, events: TrackedViewPayload[], keepalive = false): Promise<TrackViewsResult> =>
      fetch(`${ url }/rest/v1/rpc/track_views`, {
        method:    'POST',
        keepalive,
        headers:   {
          'Content-Type': 'application/json',
          apikey:         anonKey,
          Authorization:  `Bearer ${ getAccessToken() ?? anonKey }`
        },
        body: JSON.stringify({ p_visitor: visitor, p_events: events })
      })
        .then((response): TrackViewsResult => {
          if (response.ok) {
            return 'ok';
          }
          // PostgREST: 404 = function not in the schema cache, 401/403 = execute revoked.
          return [401, 403, 404].includes(response.status) ? 'missing' : 'error';
        })
        .catch((): TrackViewsResult => 'error')
  };
}
