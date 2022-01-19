export interface EnvironmentModel {
  production: boolean;
  supabase: {
    url: string
    key: string
  };
  firebase: any;
}
