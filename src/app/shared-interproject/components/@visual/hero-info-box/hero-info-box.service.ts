import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable()
export class HeroInfoBoxService {
  readonly infoText$ = new BehaviorSubject<string>('');

  readonly hoverStart$ = new Subject<string>();
  readonly hoverEnd$ = new Subject<string>();

  constructor() {
    this.hoverStart$.subscribe(value => this.infoText$.next(value));
    this.hoverEnd$.subscribe(() => this.infoText$.next(''));
  }


}
