import { Injectable }      from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class GraphViewService {
  readonly selectedNode$: BehaviorSubject<any | undefined> = new BehaviorSubject<any>(undefined);
  
  constructor() {
  }
}
