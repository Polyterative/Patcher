import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                          from '@angular/core';
import {
  BehaviorSubject,
  Subject
}                          from 'rxjs';
import { takeUntil }       from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { Patch }           from 'src/app/models/models';

@Component({
  selector:        'app-user-patches',
  templateUrl:     './user-patches.component.html',
  styleUrls:       ['./user-patches.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserPatchesComponent implements OnInit {
  data$: BehaviorSubject<Patch[]> = new BehaviorSubject([]);
  
  constructor(
    public backend: SupabaseService
  ) {
    this.backend.get.userPatches()
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(x => this.data$.next(x));
  }
  
  ngOnInit(): void {
    
  }
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
