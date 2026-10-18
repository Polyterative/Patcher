export interface EnvironmentModel {
  production: boolean;
  supabase: {
    url: string
    key: string
  };
  /** Cloudflare Turnstile site key for signup + password-reset; empty disables the widget. */
  turnstileSiteKey: string;
  features: {
    collectionsEnabled: boolean;
    coolReactionsEnabled: boolean;
    developerApiEnabled: boolean;
    modularGridImportEnabled: boolean;
    marketplaceEnabled: boolean;
    /** Manufacturer page Featured / Activity / Widget embed preview sections (unreleased). */
    manufacturerInsightsEnabled: boolean;
    /** First-party view counting for the self-host Grafana (`ViewTrackingService`). */
    viewTrackingEnabled: boolean;
    /** Maintenance read-only mode: creating and editing controls are disabled with a tooltip. */
    readOnlyModeEnabled: boolean;
  };
}
