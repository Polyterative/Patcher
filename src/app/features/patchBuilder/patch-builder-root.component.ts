import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                          from '@angular/core';
import {
  BehaviorSubject,
  Subject
}                          from 'rxjs';
import {
  CV,
  DbModule
}                          from '../../models/models';
import { SupabaseService } from '../backend/supabase.service';

@Component({
  selector:        'app-patch-builder-root',
  templateUrl:     './patch-builder-root.component.html',
  styleUrls:       ['./patch-builder-root.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchBuilderRootComponent implements OnInit {
  userModules$: BehaviorSubject<DbModule[]> = new BehaviorSubject([]);
  userPatches$: BehaviorSubject<[]> = new BehaviorSubject([]);
  
  inClick$ = new Subject<[CV, DbModule]>();
  outClick$ = new Subject<[CV, DbModule]>();
  
  // connections$ = new BehaviorSubject<Connection[]>([]);
  
  constructor(
    public backend: SupabaseService
  ) {
    this.backend.get.userModules()
        .subscribe(value => this.userModules$.next(value));
  
    // this.inClick$
    //     .pipe(
    //       withLatestFrom(this.outClick$, this.connections$))
    //     .subscribe(([inD, outD, connections]) => {
    //  
    //       this.connections$.next([
    //         ...connections,
    //         {
    //           from:   outD[1],
    //           fromCV: outD[0],
    //           to:     inD[1],
    //           toCV:   inD[0]
    //         }
    //       ]);
    //     });
  }
  
  ngOnInit(): void {
    
  }
  
}
