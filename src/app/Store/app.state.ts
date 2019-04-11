import {
  EmitterAction,
  Receiver
} from '@ngxs-labs/emitter';
import {
  Selector,
  State,
  StateContext
} from '@ngxs/store';

export type PageStatusCases = 'LOADING' | 'IDLE' | 'ERROR' | 'INITIALIZING';

export interface AppStateModel {
  pageStatus: PageStatusCases;
  pageTitle: string;
  userName: string;
}

@State<AppStateModel>({
  name:     'AppState',
  defaults: {
    pageStatus: 'INITIALIZING',
    userName:   'default',
    pageTitle:  'pageName'
  }
})
export class AppState {
  
  @Selector()
  static pageTitle(state: AppStateModel): string {
    return state.pageTitle;
  }
  
  @Receiver({type: '[Global] Page status'})
  static setPageStatus({patchState}: StateContext<AppStateModel>, {payload}: EmitterAction<PageStatusCases>): void {
    patchState({pageStatus: payload});
  }
  
  @Receiver({type: '[Global] Username '})
  static setUsername({patchState}: StateContext<AppStateModel>, {payload}: EmitterAction<string>): void {
    patchState({userName: payload});
  }
  
  @Receiver({type: '[Global] Page title '})
  static setPageTitle({patchState}: StateContext<AppStateModel>, {payload}: EmitterAction<string>): void {
    patchState({pageTitle: payload});
  }
  
}
