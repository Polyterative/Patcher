import {
  EmitterAction,
  Receiver
} from '@ngxs-labs/emitter';
import {
  State,
  StateContext
} from '@ngxs/store';

export type PageStatusCases = 'LOADING' | 'IDLE' | 'ERROR';

export interface AppStateModel {
  pageStatus: PageStatusCases;
  userName: string;
}

@State<AppStateModel>({
  name:     'AppState',
  defaults: {
    pageStatus: 'IDLE',
    userName:   'default'
  }
})
export class AppState {
  
  @Receiver({type: '[Global] Current page status'})
  static setPageStatus({patchState}: StateContext<AppStateModel>, {payload}: EmitterAction<PageStatusCases>): void {
    patchState({pageStatus: payload});
  }
  
}
