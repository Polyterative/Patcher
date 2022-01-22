import { Injectable }      from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class GraphViewService {
  readonly selectedNode$: BehaviorSubject<any | undefined> = new BehaviorSubject<any>(undefined);
  
  constructor() {
    this.selectedNode$.subscribe(node => {
      console.log('selected node', node);
      
      if (node) {
      }
    });
  }
}
