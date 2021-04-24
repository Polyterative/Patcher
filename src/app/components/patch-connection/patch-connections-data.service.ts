import {
  Injectable,
  OnDestroy
}                                from '@angular/core';
import { MatSnackBar }           from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  Subject
}                                from 'rxjs';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService }       from 'src/app/features/backend/supabase.service';
import { CV }                    from 'src/app/models/models';


@Injectable()
export class PatchConnectionsDataService implements OnDestroy {
  // modulesList$ = new BehaviorSubject<MinimalModule[]>([]);
  // userModulesList$ = new BehaviorSubject<DbModule[]>([]);
  // updateModulesList$ = new Subject();
  //
  selected$ = new BehaviorSubject<[CV | null, CV | null]>([
    null,
    null
  ]);
  
  constructor(
    private userService: UserManagementService,
    private snackBar: MatSnackBar,
    private backend: SupabaseService
  ) {
    
  }
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
