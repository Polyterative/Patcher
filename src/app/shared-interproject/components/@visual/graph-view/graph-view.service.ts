import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GraphNode } from './graph.component';

@Injectable()
export class GraphViewService {
  readonly selectedNode$: BehaviorSubject<GraphNode | undefined> = new BehaviorSubject<GraphNode | undefined>(undefined);
  
  constructor() {
  }
}
