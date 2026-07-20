import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { StandardsApiService } from '../../features/backend/standards-api.service';
import { Standard } from '../../models/standard';
import { SubManager } from '../../shared-interproject/directives/subscription-manager';

@Injectable({
  providedIn: 'root'
})
export class StandardsService extends SubManager {
  readonly standards = {
    update$: new Subject<void>(),
    data$:   new BehaviorSubject<Standard[] | undefined>(undefined)
  };
  
  constructor(
    readonly standardsApi: StandardsApiService
  ) {
    
    super();
    
    this.manageSub(
      this.standards.update$
          .pipe(
            tap(() => this.standards.data$.next(undefined)),
            switchMap(() => this.standardsApi.list())
          )
          .subscribe(x => {
            this.standards.data$.next(
              (x.data ?? []).sort((a, b) => a.id - b.id)
            );
          })
    );
    
    this.standards.update$.next();
    
  }
}
