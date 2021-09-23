import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                                   from '@angular/core';
import {
  ClusterNode,
  Edge,
  Layout,
  Node
}                                   from '@swimlane/ngx-graph';
import { BehaviorSubject }          from 'rxjs';
import {
  filter,
  tap,
  withLatestFrom
}                                   from 'rxjs/operators';
import { ModuleBrowserDataService } from '../../../features/module-browser/module-browser-data.service';
import {
  MinimalModule,
  Patch,
  PatchConnection
}                                   from '../../../models/models';
import { SubManager }               from '../../../shared-interproject/directives/subscription-manager';
import { PatchDetailDataService }   from '../patch-detail-data.service';

@Component({
  selector:        'app-patch-graph',
  templateUrl:     './patch-graph.component.html',
  styleUrls:       ['./patch-graph.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchGraphComponent extends SubManager implements OnInit {
  
  modulesAsNodes$: BehaviorSubject<Node[]> = new BehaviorSubject([]);
  links$: BehaviorSubject<Edge[]> = new BehaviorSubject([]);
  
  constructor(
    public patchDetailDataService: PatchDetailDataService
    // public userModulesService: ModuleBrowserDataService
  ) {
    super();
  }
  
  ngOnInit(): void {
    this.manageSub(
      this.patchDetailDataService.patchesConnections$
          .pipe(tap(x => this.modulesAsNodes$.next([])))
          .pipe(tap(x => this.links$.next([])))
          .pipe(filter(data => !!data))
        // .pipe(
        //   withLatestFrom(
        // this.userModulesService.userModulesList$
        // )
        // )
          .subscribe((patchConnections => {
              const modulesList = this.extractUnique(patchConnections);
            
              this.modulesAsNodes$.next(modulesList.map(module => ({
                id:    module.id.toString(),
                label: module.name
              })));
            
              this.links$.next(patchConnections.map(patch => ({
                source: patch.a.module.id.toString(),
                target: patch.b.module.id.toString()
              })));
            
              console.log(modulesList);
            })
          ));
    
  }
  
  private extractUnique(patchConnections: PatchConnection[]): MinimalModule[] {
    const modulesList: MinimalModule[] = [];
    
    patchConnections.forEach(connection => {
      const addIfNotPresent = (module: MinimalModule): void => {
        let isPresent: boolean = modulesList.some(x => x.id === module.id);
        if (!isPresent) {modulesList.push(module); }
      };
      
      addIfNotPresent(connection.a.module);
      addIfNotPresent(connection.b.module);
      
    });
    
    return modulesList;
  }
}
