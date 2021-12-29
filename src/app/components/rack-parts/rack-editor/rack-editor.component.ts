import { moveItemInArray }         from '@angular/cdk/drag-drop';
import { CdkDragDrop }             from '@angular/cdk/drag-drop/drag-events';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnInit
}                                  from '@angular/core';
import { MatSnackBar }             from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  Subject
}                                  from 'rxjs';
import {
  take,
  withLatestFrom
}                                  from 'rxjs/operators';
import { RackDetailDataService }   from 'src/app/components/rack-parts/rack-detail-data.service';
import { SupabaseService }         from 'src/app/features/backend/supabase.service';
import {
  RackedModule,
  RackMinimal
}                                  from 'src/app/models/models';
import { SubManager }              from '../../../shared-interproject/directives/subscription-manager';
import { ModuleMinimalViewConfig } from '../../module-parts/module-minimal/module-minimal.component';

@Component({
  selector:        'app-rack-editor',
  templateUrl:     './rack-editor.component.html',
  styleUrls:       ['./rack-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RackEditorComponent extends SubManager implements OnInit {
  @Input() data: RackMinimal;
  rowedRackedModules$ = new BehaviorSubject<RackedModule[][]>([]);
  
  
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public dataService: RackDetailDataService
    // userManagerService: UserManagementService
  ) { super(); }
  
  
  protected destroyEvent$ = new Subject<void>();
  viewConfig: ModuleMinimalViewConfig = {
    hideLabels:       true,
    hideManufacturer: false,
    hideDescription:  false,
    hideButtons:      true,
    hideHP:           false,
    hideDates:        true
  };
  
  ngOnInit(): void {
    this.manageSub(
      this.backend.get.rackedModules(this.data.id)
          .subscribe((rackedModules: RackedModule[]) => {
            // create a 2d array of racked modules and sort them by row
            let rowedRackedModules = this.buildRowedModulesArray(rackedModules);
            this.rowedRackedModules$.next(rowedRackedModules);
          })
    );
    
    
    this.manageSub(
      this.dataService.rackOrderChange$
          .pipe(
            withLatestFrom(this.rowedRackedModules$)
          )
          .subscribe(([{event,newRow,module}, rackModules]) => {
  
            // update array
            if (newRow === module.rackingData.row) {
              this.transferInRow(rackModules, newRow, event);
            } else {
              this.transferBetweenRows(rackModules, module, event, newRow);
            }
  
            this.rowedRackedModules$.next(rackModules);
  
            this.backend.update.rackedModules(rackModules.flatMap(row => row))
                .pipe(take(1))
                .subscribe();
  
            this.backend.update.rack(this.data)
                .pipe(take(1))
                .subscribe();
  
          })
    );
  
  
  }
  
  private buildRowedModulesArray(rackedModules: RackedModule[]): RackedModule[][] {
    let rowedRackedModules: RackedModule[][] = [];
    for (let i = 0; i < this.data.rows; i++) {
      rowedRackedModules[i] = rackedModules.filter(module => module.rackingData.row === i);
    }
    return rowedRackedModules;
  }
  
  private transferInRow(rackModules: RackedModule[][], newRow: number, event: CdkDragDrop<ElementRef>): void {
    moveItemInArray(rackModules[newRow], event.previousIndex, event.currentIndex);
    // update module position
    this.updateModulesColumnIds(rackModules, newRow);
  }
  
  private updateModulesColumnIds(rackModules: RackedModule[][], row): void {
    rackModules[row].forEach((module, index) => {
      module.rackingData.column = index;
      module.rackingData.row = row;
    });
  }
  
  private transferBetweenRows(rackModules: RackedModule[][], module: RackedModule, event, newRow): void {
    // remove item from old array
    rackModules[module.rackingData.row].splice(event.previousIndex, 1);
    this.updateModulesColumnIds(rackModules, module.rackingData.row);
    
    
    // add item to new array
    rackModules[newRow].splice(event.currentIndex, 0, module);
    this.updateModulesColumnIds(rackModules, newRow);
    
  }
  
  computeDragRenderPos(pos, dragRef) {
    return {
      x: Math.floor(pos.x / 32) * 32,
      y: pos.y
    }; // will render the element every 30 pixels horizontally
  }
  
  falsePredicate(event: any) {
    return false;
  }
  
}
