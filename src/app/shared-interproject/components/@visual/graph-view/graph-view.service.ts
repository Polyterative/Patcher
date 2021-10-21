import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Subject
}                     from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GraphViewService {
  readonly center$: Subject<boolean> = new Subject();
  
  readonly update$: Subject<boolean> = new Subject();
  readonly zoomToFit$: Subject<boolean> = new Subject();
  readonly autoZoom$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  readonly autoCenter$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
}
