import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                          from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MinimalModule }   from '../../../models/models';
import { SupabaseService } from '../../backend/supabase.service';

@Component({
  selector:        'app-user-modules',
  templateUrl:     './user-modules.component.html',
  styleUrls:       ['./user-modules.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserModulesComponent implements OnInit {
  userModules$: BehaviorSubject<MinimalModule[]> = new BehaviorSubject([]);
  userPatches$: BehaviorSubject<[]> = new BehaviorSubject([]);
  
  constructor(
    public backend: SupabaseService
  ) {
    this.backend.get.userModules()
        .subscribe(value => this.userModules$.next(value));
    // .subscribe(value => console.log(value));
  }
  
  ngOnInit(): void {
    
  }
  
}
