import { BehaviorSubject } from 'rxjs';

export class ToolbarService {

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
