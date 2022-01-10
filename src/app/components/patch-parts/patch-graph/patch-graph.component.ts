import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                                 from '@angular/core';
import {
  ClusterNode,
  Edge,
  Node
}                                 from '@swimlane/ngx-graph';
import {
  BehaviorSubject,
  forkJoin
}                                 from 'rxjs';
import {
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom
}                                 from 'rxjs/operators';
import { SupabaseService }        from 'src/app/features/backend/supabase.service';
import { PatchConnection }        from '../../../models/connection';
import {
  DbModule,
  MinimalModule
}                                 from '../../../models/module';
import { GraphViewService }       from '../../../shared-interproject/components/@visual/graph-view/graph-view.service';
import { SubManager }             from '../../../shared-interproject/directives/subscription-manager';
import { PatchDetailDataService } from '../patch-detail-data.service';

@Component({
  selector:        'app-patch-graph',
  templateUrl:     './patch-graph.component.html',
  styleUrls:       ['./patch-graph.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatchGraphComponent extends SubManager implements OnInit {
  
  nodes$: BehaviorSubject<Node[]> = new BehaviorSubject([]);
  clusters$: BehaviorSubject<ClusterNode[]> = new BehaviorSubject([]);
  links$: BehaviorSubject<Edge[]> = new BehaviorSubject([]);
  
  constructor(
    public patchDetailDataService: PatchDetailDataService,
    public backend: SupabaseService,
    public graphViewService: GraphViewService
    // public userModulesService: ModuleBrowserDataService
  ) {
    super();
  }
  
  ngOnInit(): void {
    this.manageSub(
      this.patchDetailDataService.patchesConnections$
          .pipe(
            tap(x => this.nodes$.next([])),
            tap(x => this.clusters$.next([])),
            tap(x => this.links$.next([])),
            filter(data => !!data),
            switchMap(x => forkJoin(
                this.extractModules(x)
                    .map(module => this.backend.get.moduleWithId(module.id)
                                       .pipe(map(m => m.data)))
              )
            ),
            withLatestFrom(this.patchDetailDataService.patchesConnections$)
          )
        // .pipe(
        //   withLatestFrom(
        // this.userModulesService.userModulesList$
        // )
        // )
          .subscribe(([modules, connections]: [DbModule[], PatchConnection[]]) => {
    
              const clusters: ClusterNode[] = [];
              const nodes: Node[] = [];
    
              modules
                .forEach(module => {
  
                  const moduleId: string = module.id.toString();
  
                  const outs: Node[] = module.outs.map(x => ({
                    id:    moduleId + x.id,
                    label: x.name,
                    data:  {
                      color: '11c757'
                    }
                  }));
  
                  const ins: Node[] = module.ins.map(x => ({
                    id:    moduleId + x.id,
                    label: x.name,
                    data:  {
                      color: 'a9d2020'
                    }
                  }));
  
                  clusters.push({
                    id:           moduleId,
                    label:        module.name,
                    dimension:    {
                      width:  400,
                      height: 800
                    },
                    childNodeIds: [
                      ...outs.map(x => x.id),
                      ...ins.map(x => x.id)
                    ]
                  });
  
                  // nodes = nodes.concat(outs);
                  // nodes = nodes.concat(ins);
  
                });
    
              connections.forEach(connection => {
                const nodeIdA: string = connection.a.module.id.toString() + connection.a.id;
                if (!nodes.some(node => node.id == nodeIdA)) {
                  nodes.push({
                    id:    nodeIdA,
                    label: connection.a.name
                  });
                }
      
                const nodeIdB: string = connection.b.module.id.toString() + connection.b.id;
                if (!nodes.some(node => node.id == nodeIdB)) {
                  nodes.push({
                    id:    nodeIdB,
                    label: connection.b.name
                  });
                }
      
              });
    
              this.nodes$.next(nodes);
              this.clusters$.next(clusters);
    
              // this.links$.next(connections.map(patch => ({
              //   source: patch.a.module.id + patch.a.id.toString(),
              //   target: patch.b.module.id + patch.b.id.toString()
              // })));
    
              this.links$.next(connections.map(patch => ({
                source: patch.a.module.id + patch.a.id.toString(),
                target: patch.b.module.id + patch.b.id.toString()
              })));
    
              this.graphViewService.center$.next(true);
    
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
