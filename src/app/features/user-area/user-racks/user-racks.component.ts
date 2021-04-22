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
import { Rack }            from 'src/app/models/models';

@Component({
  selector:        'app-user-racks',
  templateUrl:     './user-racks.component.html',
  styleUrls:       ['./user-racks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserRacksComponent implements OnInit {
  data$: BehaviorSubject<Rack[]> = new BehaviorSubject([]);
  
  constructor(
    public backend: SupabaseService
  ) {
    this.backend.get.userRacks()
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
