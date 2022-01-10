import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                  from '@angular/core';
import { BehaviorSubject }         from 'rxjs';
import { SupabaseService }         from 'src/app/features/backend/supabase.service';
import { ModuleMinimalViewConfig } from '../../../components/module-parts/module-minimal/module-minimal.component';
import { MinimalModule }           from '../../../models/module';
import { SubManager }              from '../../../shared-interproject/directives/subscription-manager';

@Component({
  selector:        'app-user-modules',
  templateUrl:     './user-modules.component.html',
  styleUrls:       ['./user-modules.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserModulesComponent extends SubManager implements OnInit {
  data$: BehaviorSubject<MinimalModule[]> = new BehaviorSubject([]);
  @Input() viewConfig: ModuleMinimalViewConfig;
  
  constructor(
    public backend: SupabaseService
  ) {
    super();
    
    this.manageSub(
      this.backend.get.userModules()
          .pipe()
          .subscribe(x => this.data$.next(x))
    );
  }
  
  ngOnInit(): void {
  
  }
  
}
