import {
  EmitterAction,
  Receiver
} from '@ngxs-labs/emitter';
import {
  State,
  StateContext
} from '@ngxs/store';

// export type ToolbarVisibilityStatusCases = 'VISIBLE' | 'HIDDEN';
// export type ToolbarLoadingStatusCases = 'LOADED' | 'LOADING';

export enum ToolbarPrimaryIcon {
  ADD    = 'add',
  SEARCH = 'search',
  SAVE   = 'save'
}

interface PrimaryButtonModel {
  primaryVisible: boolean;
  primaryDisabled: boolean;
  primaryAutoDisabled: boolean;
  primaryIcon: ToolbarPrimaryIcon;
}

export interface ToolbarStateModel extends PrimaryButtonModel {
  titleText: string;
  visible: boolean;
  loading: boolean;
}

const NAME = 'Toolbar';

@State<ToolbarStateModel>({
  name:     NAME,
  defaults: {
    visible:             true,
    loading:             false,
    titleText:           'title',
    primaryVisible:      true,
    primaryDisabled:     true,
    primaryAutoDisabled: true,
    primaryIcon:         ToolbarPrimaryIcon.ADD
    
  }
})
export class ToolbarState {
  
  @Receiver({type: `[${ NAME }] Visibility status changing`})
  static visibilityStatus({patchState}: StateContext<ToolbarStateModel>, {payload}: EmitterAction<boolean>): void {
    patchState({visible: payload});
  }
  
  @Receiver({type: `[${ NAME }] Loading status changing`})
  static loadingStatus({patchState}: StateContext<ToolbarStateModel>, {payload}: EmitterAction<boolean>): void {
    patchState({loading: payload});
  }
  
  @Receiver({type: `[${ NAME }]  Text content changing`})
  static toolbarText({patchState, dispatch, getState}: StateContext<ToolbarStateModel>, {payload}: EmitterAction<string>): void {
    patchState({titleText: payload});
  }
  
  // --------------------------------------------------
  
  @Receiver({type: `[${ NAME }] Primary visibility status changing`})
  static primaryVisible({patchState}: StateContext<ToolbarStateModel>, {payload}: EmitterAction<boolean>): void {
    patchState({primaryVisible: payload});
  }
  
  @Receiver({type: `[${ NAME }] Primary disability status changing`})
  static primaryDisabled({patchState}: StateContext<ToolbarStateModel>, {payload}: EmitterAction<boolean>): void {
    patchState({primaryDisabled: payload});
  }
  
  @Receiver({type: `[${ NAME }] Primary auto visibility status changing`})
  static primaryAutoDisabled({patchState}: StateContext<ToolbarStateModel>, {payload}: EmitterAction<boolean>): void {
    patchState({primaryAutoDisabled: payload});
  }
  
  @Receiver({type: `[${ NAME }] Primary icon changing`})
  static primaryIcon({patchState}: StateContext<ToolbarStateModel>, {payload}: EmitterAction<ToolbarPrimaryIcon>): void {
    patchState({primaryIcon: payload});
  }
  
  // --------------------------------------------------
  
  @Receiver({type: `[${ NAME }] back Click`})
  static backClick({patchState}: StateContext<ToolbarStateModel>): void {
    patchState({primaryVisible: false, primaryIcon: ToolbarPrimaryIcon.ADD});
  }
  
  @Receiver({type: `[${ NAME }] primary Click`})
  static primaryClick({patchState}: StateContext<ToolbarStateModel>): void {
    // patchState({primaryAutoDisabled: payload});
  }
}
