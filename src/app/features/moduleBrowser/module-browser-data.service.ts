import { Injectable }          from '@angular/core';
import { FirebaseService }     from '../backend/firebase.service';
import { LocalStorageService } from '../backend/local-storage.service';
import { SupabaseService }     from '../backend/supabase.service';

@Injectable()
export class ModuleBrowserDataService {
    // modules$: Observable<DBEuroModule[]>;
    
    constructor(
      private api: FirebaseService,
      public storage: LocalStorageService,
      public backend: SupabaseService
    ) {
        // @ts-ignore
        
        // this.modules$ = api.get.euromodulesPublic();
    }
    
}