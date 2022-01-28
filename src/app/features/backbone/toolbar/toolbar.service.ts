import { BehaviorSubject } from 'rxjs';

export class ToolbarService {

  // readonly emitters = {
  //   backClick$:    new EventEmitter<void>(),
  //   primaryClick$: new EventEmitter<void>()
  // };

  // readonly serviceFmitters = {
  //   addMenuOption$:         new EventEmitter<CardLink[]>(),
  //   clearMenuOptions$:      new EventEmitter<void>(),
  //   addFixedMenuOption$:    new EventEmitter<CardLink[]>(),
  //   clearFixedMenuOptions$: new EventEmitter<void>()
  // };

  readonly state = {
    title:           new BehaviorSubject('patcher.xyz'),
    toolbarVisible$: new BehaviorSubject(true)
  };

}

export enum ToolbarPrimaryIcon {
  ADD    = 'add',
  SEARCH = 'search',
  SAVE   = 'save'
}

// export interface ToolbarMenuOption {
//     label: string;
//     icon: string;
//     emitter: EventEmitter<string>;
//     // selected?: boolean;
//
//     disabled?(): boolean;
// }
