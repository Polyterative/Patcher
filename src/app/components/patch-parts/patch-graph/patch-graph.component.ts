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
import {
  BehaviorSubject,
  forkJoin
}                                   from 'rxjs';
import {
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom
}                                   from 'rxjs/operators';
import { SupabaseService }          from 'src/app/features/backend/supabase.service';
import { ModuleBrowserDataService } from '../../../features/module-browser/module-browser-data.service';
import { PatchConnection }          from '../../../models/connection';
import {
  DbModule,
  MinimalModule
}                                   from '../../../models/module';
import { Patch }                    from '../../../models/patch';
import { SubManager }               from '../../../shared-interproject/directives/subscription-manager';
import { PatchDetailDataService }   from '../patch-detail-data.service';

@Component({
  selector:        'app-patch-graph',
  templateUrl:     './patch-graph.component.html',
  styleUrls:       ['./patch-graph.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchGraphComponent extends SubManager implements OnInit {
  
  modulesAsNodes$: BehaviorSubject<ClusterNode[]> = new BehaviorSubject([]);
  links$: BehaviorSubject<Edge[]> = new BehaviorSubject([]);
  
  constructor(
    public patchDetailDataService: PatchDetailDataService,
    public backend: SupabaseService
    // public userModulesService: ModuleBrowserDataService
  ) {
    super();
  }
  
  ngOnInit(): void {
    this.manageSub(
      this.patchDetailDataService.patchConnections$
          .pipe(
            tap(x => this.modulesAsNodes$.next([])),
            tap(x => this.links$.next([])),
            filter(data => !!data),
            map(patchConnections => this.extractModules(patchConnections)),
            map(x => x.map(module => this.backend.get.moduleWithId(module.id)
                                         .pipe(map(m => m.data)))),
            switchMap(forkJoin),
            withLatestFrom(this.patchDetailDataService.patchConnections$)
          )
        // .pipe(
        //   withLatestFrom(
        // this.userModulesService.userModulesList$
        // )
        // )
          .subscribe(([modules, connections]: [DbModule[], PatchConnection[]]) => {
  
            let clusters: ClusterNode[] = [];
  
            modules
              .forEach(module => {
      
                const moduleId: string = module.id.toString();
      
                const outs: ClusterNode[] = module.outs.map(x => ({
                  id:    moduleId + x.id,
                  label: x.name
                }));
      
                const ins = module.ins.map(x => ({
                  id:    moduleId + x.id,
                  label: x.name
                }));
      
                clusters.push({
                  id:           moduleId,
                  label:        module.name,
                  childNodeIds: [
                    ...outs.map(x => x.id),
                    ...ins.map(x => x.id)
                  ]
                });
  
                clusters = clusters.concat(outs);
                clusters = clusters.concat(ins);
  
              });
            
            this.modulesAsNodes$.next(clusters);
    
            this.links$.next(connections.map(patch => ({
                source: patch.a.module.id + patch.a.id.toString(),
                target: patch.b.module.id + patch.b.id.toString()
              })));
    
            console.log(modules);
            }
          ));
    
  }
  
  private extractModules = (patchConnections: PatchConnection[]): MinimalModule[] => {
    const modulesList: MinimalModule[] = [];
    
    patchConnections.forEach(connection => {
      const addIfNotPresent = (module: MinimalModule): void => {
        const isPresent: boolean = modulesList.some(x => x.id === module.id);
        if (!isPresent) {modulesList.push(module); }
      };
      
      addIfNotPresent(connection.a.module);
      addIfNotPresent(connection.b.module);
      
    });
    
    return modulesList;
  };
}
