import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                                  from '@angular/core';
import { MatSnackBar }             from '@angular/material/snack-bar';
import { Subject }                 from 'rxjs';
import {
  filter,
  takeUntil,
  withLatestFrom
}                                  from 'rxjs/operators';
import { RackDetailDataService }   from 'src/app/components/rack-parts/rack-detail-data.service';
import { SupabaseService }         from 'src/app/features/backend/supabase.service';
import {
  RackedModule,
  RackMinimal
}                                  from 'src/app/models/models';
import {
  ContextMenuItem,
  GeneralContextMenuDataService
}                                  from '../../../shared-interproject/components/@smart/general-context-menu/general-context-menu-data.service';
import { SubManager }              from '../../../shared-interproject/directives/subscription-manager';
import { ModuleMinimalViewConfig } from '../../module-parts/module-minimal/module-minimal.component';

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
export class RackEditorComponent extends SubManager implements OnInit {
  @Input() data: RackMinimal;
  
  moduleRightClick$ = new Subject<ModuleRightClick>();
  
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public dataService: RackDetailDataService,
    public contextMenu: GeneralContextMenuDataService
    // userManagerService: UserManagementService
  ) {
    super();
    
    
  }
  
  
  viewConfig: ModuleMinimalViewConfig = {
    hideLabels:       true,
    hideManufacturer: false,
    hideDescription:  false,
    hideButtons:      true,
    hideHP:           false,
    hideDates:        true
  };
  
  ngOnInit(): void {
  
    let rightClick$ = this.moduleRightClick$.pipe(withLatestFrom(
      this.dataService.isCurrentRackPropertyOfCurrentUser$,
      this.dataService.isCurrentRackEditable$
    ));
  
  
    this.manageSub(
      rightClick$
        .pipe(
          filter(([, isCurrentRackPropertyOfCurrentUser, isCurrentRackEditable]) => isCurrentRackPropertyOfCurrentUser && isCurrentRackEditable)
        )
        .subscribe(([
                      {
                        $event,
                        rackedModule
                      }, and, b
                    ]) => {
        
          const duplicate$ = new Subject<ContextMenuItem>();
          const delete$ = new Subject<ContextMenuItem>();
        
          this.contextMenu.menuItems$.next([
            {
              id:       'name',
              label:    `${ rackedModule.module.name } (${ rackedModule.module.manufacturer.name }, ${ rackedModule.module.hp } HP)`,
              data:     rackedModule,
              disabled: true,
              click$:   new Subject<ContextMenuItem>()
            },
            {
              id:       'edit',
              label:    'Delete from rack',
              icon:     'delete',
              data:     rackedModule,
              disabled: false,
              click$:   delete$
            },
            {
              id:       'duplicate',
              label:    'Duplicate',
              icon:     'edit',
              data:     rackedModule,
              disabled: false,
              click$:   duplicate$
            }
          ]);
        
          this.contextMenu.open$.next($event);
        
          this.manageSub(
            duplicate$
              .pipe(
                takeUntil(this.contextMenu.open$)
              )
              .subscribe(_ => this.dataService.requestRackedModuleDuplication$.next(rackedModule))
          );
        
          this.manageSub(
            delete$
              .pipe(
                takeUntil(this.contextMenu.open$)
              )
              .subscribe(_ => this.dataService.requestRackedModuleRemoval$.next(rackedModule))
          );
        })
    );
    ;
  }
  
  onContextMenu($event: MouseEvent, rackedModule: RackedModule): void {
  
  
  }
}
