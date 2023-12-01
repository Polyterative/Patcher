import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable()
export class HeroInfoBoxService {
  infoText$ = new BehaviorSubject<string>('');

  hoverStart$ = new Subject<string>();
  hoverEnd$ = new Subject<string>();

  constructor() {
    this.hoverStart$.subscribe(value => this.infoText$.next(value));
    // this.hoverEnd$.pipe(throttleTime(50)).subscribe(() => this.infoText$.next(''));
    this.hoverEnd$.subscribe(() => this.infoText$.next(''));
  }


}
