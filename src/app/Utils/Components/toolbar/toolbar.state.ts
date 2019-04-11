import {
  EmitterAction,
  Receiver
} from '@ngxs-labs/emitter';
import {
  Selector,
  State,
  StateContext
} from '@ngxs/store';

export type ToolbarVisibilityStatusCases = 'VISIBLE' | 'HIDDEN';
export type ToolbarLoadingStatusCases = 'LOADED' | 'LOADING';

export interface ToolbarStateModel {
  visibility: ToolbarVisibilityStatusCases;
  loading: ToolbarLoadingStatusCases;
  titleText: string;
}

@State<ToolbarStateModel>({
  name:     'ToolbarState',
  defaults: {
    visibility: 'VISIBLE',
    loading:    'LOADED',
    titleText:  'title'
  }
})
export class ToolbarState {
  
  @Selector()
  static titleText(state: ToolbarStateModel): string {
    return state.titleText;
  }
  
  @Selector()
  static visibility(state: ToolbarStateModel): ToolbarVisibilityStatusCases {
    return state.visibility;
  }
  
  @Selector()
  static loading(state: ToolbarStateModel): ToolbarLoadingStatusCases {
    return state.loading;
  }
  
  @Receiver({type: '[Toolbar] Visibility status'})
  static setToolbarVisibilityStatus({patchState}: StateContext<ToolbarStateModel>, {payload}: EmitterAction<ToolbarVisibilityStatusCases>): void {
    patchState({visibility: payload});
  }
  
  @Receiver({type: '[Toolbar] Loading status'})
  static setToolbarLoadingStatus({patchState}: StateContext<ToolbarStateModel>, {payload}: EmitterAction<ToolbarVisibilityStatusCases>): void {
    patchState({visibility: payload});
  }
  
}
