import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                from '@angular/core';
import { MatSnackBar }           from '@angular/material/snack-bar';
import { Subject }               from 'rxjs';
import {
  filter,
  takeUntil,
  withLatestFrom
}                                from 'rxjs/operators';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { SupabaseService }       from 'src/app/features/backend/supabase.service';
import { RackedModule }          from '../../../models/module';
import { RackMinimal }           from '../../../models/rack';
import {
  ContextMenuItem,
  GeneralContextMenuDataService
}                                from '../../../shared-interproject/components/@smart/general-context-menu/general-context-menu-data.service';
import { SubManager }            from '../../../shared-interproject/directives/subscription-manager';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
}                                from '../../module-parts/module-minimal/module-minimal.component';

export interface ModuleRightClick {
  $event: MouseEvent;
  rackedModule: RackedModule;
}

@Component({
  selector:        'app-rack-editor',
  templateUrl:     './rack-editor.component.html',
  styleUrls:       ['./rack-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers:       [GeneralContextMenuDataService]
})
@Input() rack: RackMinimal;
          this.manageSub(
            delete$
              .pipe(
                takeUntil(this.contextMenu.open$)
              )
              .subscribe(_ => this.dataService.requestRackedModuleRemoval$.next(rackedModule))
          );
        })
    );
    
  }
  
}
