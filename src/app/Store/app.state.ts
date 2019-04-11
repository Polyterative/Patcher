import {
  EmitterAction,
  Receiver
} from '@ngxs-labs/emitter';
import {
  Selector,
  State,
  StateContext
} from '@ngxs/store';

export type PageStatusCases = 'LOADING' | 'IDLE' | 'ERROR';

export interface AppStateModel {
  pageStatus: PageStatusCases;
  pageTitle: string;
  userName: string;
}

@State<AppStateModel>({
  name:     'AppState',
  defaults: {
    pageStatus: 'IDLE',
    userName:   'default',
    pageTitle:  'pageName'
  }
})
export class AppState {
  
  @Selector()
  static pageTitle(state: AppStateModel): string {
    return state.pageTitle;
  }
  
  @Receiver({type: '[Global] Current page status'})
  static setPageStatus({patchState}: StateContext<AppStateModel>, {payload}: EmitterAction<PageStatusCases>): void {
    patchState({pageStatus: payload});
  }
  
  @Receiver({type: '[Global] Current username '})
  static setUsername({patchState}: StateContext<AppStateModel>, {payload}: EmitterAction<string>): void {
    patchState({userName: payload});
  }
  
  @Receiver({type: '[Global] Current page title '})
  static setPageTitle({patchState}: StateContext<AppStateModel>, {payload}: EmitterAction<string>): void {
    patchState({pageTitle: payload});
  }
  
}
