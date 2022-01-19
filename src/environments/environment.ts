// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { EnvironmentModel } from 'src/environments/environment.model';
import { firebaseConfig }   from 'src/environments/firebase';

export const environment: EnvironmentModel = {
  production: false,
  supabase:   {
    url: 'https://sozmatmywjpstwidzlss.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxODA4NDU1OCwiZXhwIjoxOTMzNjYwNTU4fQ.3pSLsqyaCAGgISvOrHMt2CIX9hQowty2r8etzMwlpy8'
  },
  firebase:   firebaseConfig
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.