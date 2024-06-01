import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import { Subject } from 'rxjs';
import {
  filter,
  takeUntil,
  withLatestFrom
} from 'rxjs/operators';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { RackedModule } from 'src/app/models/module';
import { RackMinimal } from 'src/app/models/rack';
import {
  ContextMenuItem,
  GeneralContextMenuDataService
} from 'src/app/shared-interproject/components/@smart/general-context-menu/general-context-menu-data.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from '../../module-parts/module-minimal/module-minimal.component';
import {
  fadeInOnEnterAnimation,
  fadeOutOnLeaveAnimation
} from "angular-animations";


export interface ModuleRightClick {
  $event: MouseEvent;
  rackedModule: RackedModule;
}

@Component({
  selector: 'app-rack-editor',
  templateUrl: './rack-editor.component.html',
  styleUrls: ['./rack-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GeneralContextMenuDataService],
  animations: [
    fadeInOnEnterAnimation({
      anchor: 'enter',
      duration: 1525,
      animateChildren: 'after'
    }),
    fadeOutOnLeaveAnimation({
      anchor: 'leave',
      duration: 1
    })
  ]
})
export class RackEditorComponent extends SubManager implements OnInit {
  @Input() data: RackMinimal;
  
  moduleRightClick$ = new Subject<ModuleRightClick>();
  
  viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideLabels: true,
    hideManufacturer: false,
    hideDescription: false,
    hideButtons: true,
    hideHP: false,
    hideDates: true,
    hideTags: true
  };
  //
  @ViewChild('screen') screenReference: ElementRef;
  @ViewChild('canvas') canvasReference: ElementRef;
  @ViewChild('download') downloadReference: ElementRef;
  
  //
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public dataService: RackDetailDataService,
    public contextMenu: GeneralContextMenuDataService
    // userManagerService: UserManagementService
  ) {
    super();
    
  }
  
  ngOnInit(): void {
    
    const rightClick$ = this.moduleRightClick$.pipe(withLatestFrom(
      this.dataService.isCurrentRackPropertyOfCurrentUser$,
      this.dataService.isCurrentRackEditable$
    ));
    
    this.manageSub(
      rightClick$
        .pipe(
          filter(([, isCurrentRackPropertyOfCurrentUser, isCurrentRackEditable]) =>
            isCurrentRackPropertyOfCurrentUser && isCurrentRackEditable
          )
        )
        .subscribe(([
                      {
                        $event,
                        rackedModule
                      }, and, b
                    ]) => {
          
          const duplicateModule$ = new Subject<ContextMenuItem>();
          const deleteModule$ = new Subject<ContextMenuItem>();
          const replaceWithBlank$ = new Subject<ContextMenuItem>();
          
          this.contextMenu.menuItems$.next([
            {
              id: 'name',
              label: `${ rackedModule.module.name } (${ rackedModule.module.manufacturer.name }, ${ rackedModule.module.hp } HP)`,
              data: rackedModule,
              disabled: true,
              click$: new Subject<ContextMenuItem>()
            },
            {
              id: 'duplicate',
              label: 'Duplicate',
              icon: 'content_copy',
              data: rackedModule,
              disabled: false,
              click$: duplicateModule$
            },
            {
              id: 'void-spacer',
              label: '-',
              icon: '',
              data: undefined,
              disabled: true,
              click$: new Subject<ContextMenuItem>()
            },
            {
              id: 'void-spacer',
              label: '-',
              icon: '',
              data: undefined,
              disabled: true,
              click$: new Subject<ContextMenuItem>()
            },
            {
              id: 'replace-with-blank',
              label: 'Replace with blank',
              icon: 'copy_all',
              data: rackedModule,
              disabled: false,
              click$: replaceWithBlank$
            },
            {
              id: 'delete',
              label: 'Delete from rack',
              icon: 'delete',
              data: rackedModule,
              disabled: false,
              click$: deleteModule$
            }
          ]);
          
          this.contextMenu.open$.next($event);
          
          duplicateModule$
            .pipe(
              takeUntil(this.contextMenu.open$),
              takeUntil(this.destroy$)
            )
            .subscribe(_ => this.dataService.requestRackedModuleDuplication$.next(rackedModule))
          
          deleteModule$
            .pipe(
              takeUntil(this.contextMenu.open$),
              takeUntil(this.destroy$)
            )
            .subscribe(_ => this.dataService.requestRackedModuleRemoval$.next(rackedModule))
          
          replaceWithBlank$
            .pipe(
              takeUntil(this.contextMenu.open$),
              takeUntil(this.destroy$)
            )
            .subscribe(_ => this.dataService.requestRackedModuleReplaceWithBlank$.next(rackedModule))
        })
    );
    
  }
  
}