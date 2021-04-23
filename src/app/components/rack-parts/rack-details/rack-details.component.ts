import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                          from '@angular/core';
import { MatSnackBar }     from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  Subject
}                          from 'rxjs';
import { takeUntil }       from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  DbModule,
  RackMinimal
}                          from 'src/app/models/models';

@Component({
  selector:        'app-rack-details',
  templateUrl:     './rack-details.component.html',
  styleUrls:       ['./rack-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackDetailsComponent implements OnInit {
  @Input() data: RackMinimal;
  rackModules$ = new BehaviorSubject<DbModule[]>([]);
  
  
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService
    // userManagerService: UserManagementService
  ) { }
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
  
  ngOnInit(): void {
    this.backend.get.rackModules(this.data.id)
        .pipe(
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => {
          this.rackModules$.next(x);
        });
  }
  
}
