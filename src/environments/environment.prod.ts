import { EnvironmentModel } from 'src/environments/environment.model';
import { firebaseConfig }   from 'src/environments/firebase';

export const environment: EnvironmentModel = {
  production: true,
  firebase:   firebaseConfig
};
