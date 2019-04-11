import {
  EmitterAction,
  Receiver
} from '@ngxs-labs/emitter';
import {
  State,
  StateContext
} from '@ngxs/store';

export enum PageStatusCases {
  'LOADING', 'IDLE', 'ERROR'
}

export interface AppStateModel {
  pageStatus: PageStatusCases;
  userName: string;
}

@State<AppStateModel>({
  name:     'AppState',
  defaults: {
    pageStatus: PageStatusCases.IDLE,
    userName:   'default'
  }
})
export class AppState {
  
  @Receiver({payload: PageStatusCases})
  static setPageStatus(context: StateContext<AppStateModel>, action: EmitterAction<PageStatusCases>) {
    context.patchState({pageStatus: action.payload});
  }
  
}
