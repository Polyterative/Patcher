import { Injectable }        from '@angular/core';
import {
    BehaviorSubject,
    Subject
}                            from 'rxjs';
import { switchMap }         from 'rxjs/operators';
import { MinimalEuroModule } from '../../models/models';
import { SupabaseService }   from '../backend/supabase.service';

@Injectable()
export class ModuleBrowserDataService {
    modules$ = new BehaviorSubject<MinimalEuroModule[]>([]);
    updateData$ = new Subject();
    
    constructor(
      // public storage: LocalStorageService,
      public backend: SupabaseService
    ) {
        
        this.updateData$.pipe(switchMap(x => this.backend.get.euromodulesMinimal()))
            .subscribe(x => this.modules$.next(x.data));
    }
    
}