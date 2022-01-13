import { Injectable }      from '@angular/core';
import {
  ReplaySubject,
  Subject
}                          from 'rxjs';
import {
  switchMap,
  tap
}                          from 'rxjs/operators';
import { SupabaseService } from '../../../features/backend/supabase.service';
import { Rack }            from '../../../models/models';
import { SubManager }      from '../../../shared-interproject/directives/subscription-manager';

/**
 * Used to communicate track data about a particular user's racks.
 */
@Injectable()
export class UserRacksService extends SubManager {
  data$: ReplaySubject<Rack[]> = new ReplaySubject(1);
  
  public readonly updateData$ = new Subject<string | undefined>(); //user id othervise current
  
  constructor(
    public backend: SupabaseService
  ) {
    
    super();
    
    this.updateData$
        .pipe(
          tap(x => this.data$.next([])),
          switchMap(x => this.backend.get.userRacks())
        )
        .subscribe(x => this.data$.next(x));
    
    
  }
}
