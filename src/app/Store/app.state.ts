import {
  EmitterAction,
  Receiver
} from '@ngxs-labs/emitter';
import {
  State,
  StateContext
} from '@ngxs/store';

export interface AppStateModel {
  loading: boolean;
  pageTitle: string;
}

@State<AppStateModel>({
  name:     'AppStateModel',
  defaults: {
    loading:   false,
    pageTitle: 'Focus'
  }
})
export class AppState {
  
  @Receiver()
  public static setValue(ctx: StateContext<AppStateModel>, action: EmitterAction<AppStateModel>) {
    ctx.setState(action.payload);
  }
  
}
