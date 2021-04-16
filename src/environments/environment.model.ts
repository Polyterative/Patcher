import { FirebaseOptions } from '@angular/fire';

export interface EnvironmentModel {
  production: boolean;
  supabase: {
    url: string
    key: string
  }
  firebase: FirebaseOptions;
}
