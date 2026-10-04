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
  };
}
