import { Select }     from '@ngxs/store';
import { Observable } from 'rxjs';
import {
  AppState,
  AppStateModel
}                     from 'src/app/store/app.state';

export class AppStateExtendable {
  
  @Select(AppState)
  state$: Observable<AppStateModel>;
  
}
