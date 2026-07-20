export interface EnvironmentModel {
  production: boolean;
  supabase: {
    url: string
    key: string
  };
  features: {
    collectionsEnabled: boolean;
    coolReactionsEnabled: boolean;
    marketplaceEnabled: boolean;
  };
}
