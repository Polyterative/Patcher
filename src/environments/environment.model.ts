import { FirebaseModel } from 'src/environments/firebase';

export interface EnvironmentModel {
    production: boolean,
    firebase: FirebaseModel
}
