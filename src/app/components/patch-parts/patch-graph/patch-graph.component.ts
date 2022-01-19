import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                                 from '@angular/core';
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
import {
  GraphEdge,
  GraphNode
}                                 from '../../../shared-interproject/components/@visual/graph-view/graph.component';
import { SubManager }             from '../../../shared-interproject/directives/subscription-manager';
import { PatchDetailDataService } from '../patch-detail-data.service';

@Component({
  selector:        'app-patch-graph',
  templateUrl:     './patch-graph.component.html',
  styleUrls:       ['./patch-graph.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers:       [GraphViewService]
})
export class PatchGraphComponent extends SubManager implements OnInit {
  
  nodes$: BehaviorSubject<GraphNode[]> = new BehaviorSubject([]);
  // clusters$: BehaviorSubject<any[]> = new BehaviorSubject([]);
  links$: BehaviorSubject<GraphEdge[]> = new BehaviorSubject([]);
  
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
    
              const modulesNodes: GraphNode[] = [];
              const nodes: GraphNode[] = [];
              const links: GraphEdge[] = [];
              modules
                .forEach(module => {
  
                  const moduleId: string = module.id.toString();
  
                  const moduleNode: GraphNode = {
                    id:    moduleId,
                    label: module.name,
                    color: '#656565',
                    size:  10,
                    x:     1,
                    y:     1,
                    data:  {
                      type: 'module',
                      module
                    }
                  };
  
                  modulesNodes.push(moduleNode);
  
                  const outs: GraphNode[] = module.outs.map(jack => ({
                    id:    moduleId + jack.id,
                    color: '#27d580',
                    size:  5,
                    x:     1,
                    y:     1,
                    label: jack.name
                  }));
  
                  const ins: GraphNode[] = module.ins.map(jack => ({
                    id:    moduleId + jack.id,
                    color: '#e72222',
                    size:  5,
                    x:     1,
                    y:     1,
                    label: jack.name
                  }));
  
                  // uncomment to see all connections even for unused inputs/outputs
                  // nodes.push(...outs, ...ins);
  
                  // push connections between module and outs and ins
                  const insConnections: GraphEdge[] = ins.map(x => ({
                    id:    x.id,
                    from:  moduleId,
                    to:    x.id,
                    label: `in: ${ x.label }from module: ${ module.name }`
                  }));
                  const outsConnections: GraphEdge[] = outs.map(x => ({
                    id:    x.id,
                    from:  moduleId,
                    to:    x.id,
                    label: `outs: ${ x.label }from module: ${ module.name }`
    
                  }));
  
                  links.push(...insConnections);
                  links.push(...outsConnections);
  
                });
    
              connections.forEach(connection => {
                const nodeIdA: string = connection.a.module.id.toString() + connection.a.id;
                if (!nodes.some(node => node.id === nodeIdA)) {
                  nodes.push({
                    id:    nodeIdA,
                    label: connection.a.name,
                    color: '#3a6740',
                    size:  4,
                    x:     1,
                    y:     1
                  });
                }
      
                const nodeIdB: string = connection.b.module.id.toString() + connection.b.id;
                if (!nodes.some(node => node.id === nodeIdB)) {
                  nodes.push({
                    id:    nodeIdB,
                    label: connection.b.name,
                    color: '#854040',
                    size:  4,
                    x:     1,
                    y:     1
                  });
                }
      
              });
    
              const finalNodes: GraphNode[] = [
                ...modulesNodes,
                ...nodes
              ];
              // this.clusters$.next(modulesNodes);
    
              // this.links$.next(connections.map(patch => ({
              //   source: patch.a.module.id + patch.a.id.toString(),
              //   target: patch.b.module.id + patch.b.id.toString()
              // })));
    
              const connectionLinks: GraphEdge[] = connections.map(patch => ({
                id:    patch.a.module.id + patch.a.id.toString() + patch.b.module.id + patch.b.id.toString(),
                from:  patch.a.module.id + patch.a.id.toString(),
                to:    patch.b.module.id + patch.b.id.toString(),
                color: 'rgb(114,114,114)',
                size:  2,
                x:     1,
                y:     1,
                label: `from: ${ patch.a.name } to ${ patch.b.name }`
              }));
    
              links.push(...connectionLinks);
    
              this.nodes$.next(finalNodes);
              this.links$.next(links);
    
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
