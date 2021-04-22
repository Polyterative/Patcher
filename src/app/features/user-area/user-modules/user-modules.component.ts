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
import { MinimalModule }   from 'src/app/models/models';

@Component({
  selector:        'app-user-modules',
  templateUrl:     './user-modules.component.html',
  styleUrls:       ['./user-modules.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserModulesComponent implements OnInit {
  data$: BehaviorSubject<MinimalModule[]> = new BehaviorSubject([]);
  
  constructor(
    public backend: SupabaseService
  ) {
    this.backend.get.userModules()
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
