import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                          from '@angular/core';
import {
  BehaviorSubject,
  Subject
}                          from 'rxjs';
import {
  switchMap,
  tap
}                          from 'rxjs/operators';
import {
  MinimalModule,
  PatchMinimal
}                          from '../../../models/models';
import { SupabaseService } from '../../backend/supabase.service';

@Component({
  selector:        'app-module-patches',
  templateUrl:     './module-patches.component.html',
  styleUrls:       ['./module-patches.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModulePatchesComponent implements OnInit {
  @Input()
  readonly module: MinimalModule;
  public readonly updateData$ = new Subject<number>();
  data$: BehaviorSubject<PatchMinimal[] | null> = new BehaviorSubject(null);
  
  constructor(
    public backend: SupabaseService
  ) {
    this.updateData$
        .pipe(
          tap(() => this.data$.next(null)),
          switchMap(x => this.backend.get.patcherWithModule(x))
        )
        .subscribe(x => this.data$.next(x));
    
  }
  
  ngOnInit(): void {
    this.updateData$.next(this.module.id);
  }
  
}
