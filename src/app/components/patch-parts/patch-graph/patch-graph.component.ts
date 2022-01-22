import {
  ChangeDetectionStrategy,
  Component,
  OnInit
}                                 from '@angular/core';
import { fadeInAnimation }        from 'angular-animations';
import {
  BehaviorSubject,
  delay,
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
import { CVwithModule }           from '../../../models/cv';
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
  animations:      [
    fadeInAnimation({
      duration: 500,
      delay:    100,
      anchor:   'enter'
    })
  ],
  providers:       [GraphViewService]
})
export class PatchGraphComponent extends SubManager implements OnInit {
  
  nodes$: BehaviorSubject<GraphNode[]> = new BehaviorSubject([]);
  // clusters$: BehaviorSubject<any[]> = new BehaviorSubject([]);
  edges$: BehaviorSubject<GraphEdge[]> = new BehaviorSubject([]);
  
  private sizeConstant = 3;
  
  legend = [
    {
      label: 'Module',
      color: '#8974E4'
    },
    {
      label: 'CV out',
      color: '#E2523C'
    },
    {
      label: 'CV in',
      color: '#4483F2'
    }
  
  ];
  
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
      this.patchDetailDataService.patchConnections$
          .pipe(
            tap(x => this.nodes$.next([])),
            tap(x => this.edges$.next([])),
            filter(data => !!data),
            switchMap(x => forkJoin(
                this.extractModules(x)
                    .map(module => this.backend.get.moduleWithId(module.id)
                                       .pipe(map(m => m.data)))
              )
            ),
            delay(250),
            withLatestFrom(this.patchDetailDataService.patchConnections$)
          )
        // .pipe(
        //   withLatestFrom(
        // this.userModulesService.userModulesList$
        // )
        // )
          .subscribe(([modules, connections]: [DbModule[], PatchConnection[]]) => {
    
              // inverse proportion between sizeConstant and number of connections
              this.sizeConstant = this.sizeConstant * (10 / connections.length);
    
              const nodes: GraphNode[] = [];
              const allModuleJackEdges: GraphEdge[] = [];
    
              modules.forEach(module => {
      
                const moduleId: string = module.id.toString();
      
                const moduleNode: GraphNode = {
                  id:    moduleId,
                  label: module.name,
                  color: this.legend[0].color,
                  // color: '#C2781B',
                  size: this.sizeConstant * 7.5,
                  x:    1,
                  y:    1,
                  data: {
                    type: 'module',
                    module
                  }
                };
      
                nodes.push(moduleNode);
      
                const outNodes: GraphNode[] = module.outs.map(jack => ({
                  id:    moduleId + jack.id,
                  color: this.legend[1].color,
                  size:  this.sizeConstant * 5,
                  x:     1,
                  y:     1,
                  label: `${ module.name } ${ jack.name }`
                }));
      
                const inNodes: GraphNode[] = module.ins.map(jack => ({
                  id:    moduleId + jack.id,
                  color: this.legend[2].color,
                  size:  this.sizeConstant * 5,
                  x:     1,
                  y:     1,
                  label: `${ module.name } ${ jack.name }`
                }));
      
                // uncomment to see nodes even for unused inputs/outputs
                // nodes.push(...outNodes, ...inNodes);
      
                // push connections between module and outNodes and inNodes
                const insEdges: GraphEdge[] = inNodes.map(x => ({
                  id:    x.id,
                  from:  x.id,
                  to:    moduleId,
                  label: `in: ${ x.label } to module: ${ module.name }`,
                  size:  this.sizeConstant * 1,
                  type:  'arrow'
                }));
                const outsEdges: GraphEdge[] = outNodes.map(x => ({
                  id:    x.id,
                  from:  moduleId,
                  to:    x.id,
                  label: `out: ${ x.label } from module: ${ module.name }`,
                  size:  this.sizeConstant * 1,
                  type:  'arrow'
  
                }));
      
                allModuleJackEdges.push(...insEdges);
                allModuleJackEdges.push(...outsEdges);
      
              });
    
              connections.forEach(connection => {
                const cvNodeIdA: string = connection.a.module.id.toString() + connection.a.id;
                if (!nodes.some(node => node.id === cvNodeIdA)) {
                  nodes.push(this.buildNode(cvNodeIdA, connection.a, '#E2523C'));
                }
      
                const cvNodeIdB: string = connection.b.module.id.toString() + connection.b.id;
                if (!nodes.some(node => node.id === cvNodeIdB)) {
                  nodes.push(this.buildNode(cvNodeIdB, connection.b, '#4483F2'));
                }
      
              });
    
              const finalNodes: GraphNode[] = [
                ...nodes
              ];
    
              // this.allModuleJackEdges$.next(connections.map(patch => ({
              //   source: patch.a.module.id + patch.a.id.toString(),
              //   target: patch.b.module.id + patch.b.id.toString()
              // })));
    
              const patchEdges: GraphEdge[] = connections.map(patch => ({
                id:    patch.a.module.id + patch.a.id.toString() + patch.b.module.id + patch.b.id.toString(),
                from:  patch.a.module.id + patch.a.id.toString(),
                to:    patch.b.module.id + patch.b.id.toString(),
                type:  'arrow',
                color: '#c0c0c0',
                size:  this.sizeConstant * 2,
                x:     1,
                y:     1,
                label: `from: ${ patch.a.name } to ${ patch.b.name }`
              }));
    
              this.nodes$.next(finalNodes);
    
              const onlyUsedModuleJacksEdges: GraphEdge[] = allModuleJackEdges.filter(
                link => patchEdges.some(
                  connectionLink => connectionLink.from === link.from
                                    || connectionLink.to === link.to
                                    || connectionLink.from === link.to
                                    || connectionLink.to === link.from
                )
              );
    
              // console.log(allModuleJackEdges.map(patch => patch.label));
              // console.log(patchEdges.map(patch => patch.label));
              // console.log(onlyUsedModuleJacksEdges.map(patch => patch.label));
    
              this.edges$.next([
                // ...allModuleJackEdges,
                ...onlyUsedModuleJacksEdges,
                ...patchEdges
              ]);
    
              this.graphViewService.center$.next(true);
    
            }
          ));
  
  }
  
  private buildNode(nodeId: string, CV: CVwithModule, color: string): GraphNode {
    return {
      id: nodeId,
      // label: `${ CV.name }  (${ CV.module.name })`,
      label: `${ CV.name }`,
      color,
      size:  this.sizeConstant * 4,
      x:     1,
      y:     1
    };
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
