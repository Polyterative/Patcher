import { Injectable }      from '@angular/core';
import {
  BehaviorSubject,
  Subject
}                          from 'rxjs';
import {
  switchMap,
  tap
}                          from 'rxjs/operators';
import { SupabaseService } from '../../features/backend/supabase.service';
import { Standard }        from '../../models/standard';
import { SubManager }      from '../../shared-interproject/directives/subscription-manager';

@Injectable({
  providedIn: 'root'
})
export class StandardsService extends SubManager {
  readonly standards = {
    update$: new Subject<void>(),
    data$:   new BehaviorSubject<Standard[] | undefined>(undefined)
  };
  
  constructor(
    readonly backend: SupabaseService
  ) {
    
    super();
    
    this.manageSub(
      this.standards.update$
          .pipe(
            tap(() => this.standards.data$.next(undefined)),
            switchMap(() => this.backend.get.standards())
          )
          .subscribe(x => {
            this.standards.data$.next(x.data);
          })
    );
    
    this.standards.update$.next();
    
  }
}
