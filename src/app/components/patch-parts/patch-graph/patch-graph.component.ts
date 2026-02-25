import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild
} from '@angular/core';
import { fadeInAnimation } from 'angular-animations';
import {
  BehaviorSubject,
  delay,
  forkJoin,
  merge,
  Subject
} from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { PatchConnection } from 'src/app/models/connection';
import { CVwithModule } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';
import { GraphViewService } from 'src/app/shared-interproject/components/@visual/graph-view/graph-view.service';
import {
  GraphEdge,
  GraphNode
} from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { PatchDetailDataService } from '../patch-detail-data.service';


interface NodesDictionary {[id: string]: GraphNode;}

/** A unique module instance encountered in the patch connections */
interface ModuleInstance {
  moduleId: number;
  instanceId: number | undefined;
}

interface FlowAnimationState {
  baseEdges: GraphEdge[];
  flowPoolEdges: GraphEdge[];
  outgoingByNode: Map<string, GraphEdge[]>;
  currentNodeId?: string;
  edgeHeatById: Map<string, number>;
  tickCount: number;
}

@Component({
  selector: 'app-patch-graph',
  templateUrl: './patch-graph.component.html',
  styleUrls: ['./patch-graph.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInAnimation({
      duration: 500,
      delay: 100,
      anchor: 'enter'
    })
  ],
  providers: [GraphViewService],
  standalone: false
})
export class PatchGraphComponent extends SubManager implements OnInit {
  @Input() progressiveRender = false;
  /** Enables progressive node/edge reveal while keeping non-progressive data trigger behavior. */
  @Input() animateGraphBuild = false;

  nodes$: BehaviorSubject<GraphNode[]> = new BehaviorSubject([]);
  edges$: BehaviorSubject<GraphEdge[]> = new BehaviorSubject([]);
  
  @ViewChild('graphContainer') private graphContainer: ElementRef<HTMLDivElement>;

  private _isStale$ = new BehaviorSubject<boolean>(false);
  readonly isStale$ = this._isStale$.asObservable();
  
  private _manualRefresh$ = new Subject<void>();
  private _graphBuiltOnce = false;
  private revealTimers: ReturnType<typeof setTimeout>[] = [];
  private revealRunId = 0;
  private flowInterval?: ReturnType<typeof setInterval>;
  private flowState?: FlowAnimationState;
  private readonly flowStartColor = '#FFD447';
  private readonly flowEndColor = '#FFF2A3';
  private readonly flowBaseColor = '#93A0B1';
  private readonly stageBridgeColor = '#9fb4ca';
  private readonly moduleLegendColor = '#8974E4';
  private readonly boundaryStartTint = '#FFE888';
  private readonly boundaryEndTint = '#D6EBFF';
  private readonly moduleJackEdgeColor = 'rgba(137, 116, 228, 0.58)';
  private readonly patchCableBaseColor = '#93A0B1';

  legend = [
    {label: 'Module', color: this.moduleLegendColor},
    {label: 'CV out', color: '#E2523C'},
    {label: 'CV in', color: '#4483F2'},
    {
      label: 'Start',
      color: this.interpolateHexColor(this.moduleLegendColor, this.boundaryStartTint, 0.66)
    },
    {
      label: 'End',
      color: this.interpolateHexColor(this.moduleLegendColor, this.boundaryEndTint, 0.66)
    }
  ];

  private readonly baseSizeConstant = 5;

  constructor(
    public patchDetailDataService: PatchDetailDataService,
    public backend: SupabaseService,
    public graphViewService: GraphViewService
  ) {
    super();
  }

  ngOnInit(): void {
    if (!this.progressiveRender) {
      // Mark graph stale on any editorConnections$ change, but only after the
      // first build has completed (guards against false-stale on initial data load)
      this.patchDetailDataService.editorConnections$
        .pipe(
          filter(() => this._graphBuiltOnce),
          filter(Boolean),
          takeUntil(this.destroy$)
        )
        .subscribe(() => this._isStale$.next(true));
    }
    
    const autoRefresh$ = !this.progressiveRender
      ? this.patchDetailDataService.editorConnections$.pipe(
        filter(() => this._graphBuiltOnce),
        filter(Boolean),
        debounceTime(3000)
      )
      : this.patchDetailDataService.patchConnections$.pipe(filter(() => false));
    
    const manualRefresh$ = !this.progressiveRender
      ? this._manualRefresh$.pipe(
        withLatestFrom(this.patchDetailDataService.editorConnections$),
        map(([, connections]) => connections),
        filter(Boolean)
      )
      : this.patchDetailDataService.patchConnections$.pipe(filter(() => false));
    
    const buildTriggers$ = this.progressiveRender
      ? this.patchDetailDataService.patchConnections$.pipe(filter(Boolean))
      : merge(
        this.patchDetailDataService.patchConnections$.pipe(filter(Boolean)),
        autoRefresh$,
        manualRefresh$
      );
    
    buildTriggers$
      .pipe(
        tap(() => {
          const el = this.graphContainer?.nativeElement;
          if (el) { el.style.height = el.offsetHeight + 'px'; }
        }),
        tap(() => this.cancelProgressiveReveal()),
        tap(() => this.nodes$.next([])),
        tap(() => this.edges$.next([])),
        tap(() => this._isStale$.next(false)),
        switchMap(connections => {
          const uniqueModuleIds = [...new Set(
            this.extractModuleInstances(connections).map(i => i.moduleId)
          )];
          return forkJoin(
            uniqueModuleIds.map(id => this.backend.GET.moduleWithId(id).pipe(map(m => m.data)))
          ).pipe(map(modules => ({modules, connections})));
        }),
        delay(500),
        takeUntil(this.destroy$)
      )
      .subscribe(({modules, connections}: {
        modules: DbModule[],
        connections: PatchConnection[]
      }) => {

        const sizeConstant = this.computeSizeConstant(modules.length, connections.length);
        const nodesDictionary: NodesDictionary = {};
        const allModuleJackNodes: NodesDictionary = {};
        const allModuleJackEdges: {
          [id: string]: GraphEdge
        } = {};

        // Build a lookup from module id → DbModule
        const moduleLookup = new Map<number, DbModule>(modules.map(m => [m.id, m]));

        // Enumerate unique instances: (moduleId, instanceId)
        const instances = this.extractModuleInstances(connections);
        const instancesByModule = new Map<number, ModuleInstance[]>();
        instances.forEach(instance => {
          const list = instancesByModule.get(instance.moduleId) ?? [];
          list.push(instance);
          instancesByModule.set(instance.moduleId, list);
        });
        const instanceOrderByKey = new Map<string, number>();
        instancesByModule.forEach((moduleInstances, moduleId) => {
          moduleInstances.forEach((moduleInstance, index) => {
            instanceOrderByKey.set(
              this.moduleInstanceKey(moduleId, moduleInstance.instanceId),
              index + 1
            );
          });
        });
        
        instances.forEach(instance => {
          const module = moduleLookup.get(instance.moduleId);
          if (!module) { return; }
          
          const instanceSuffix = instance.instanceId != null ? `_${ instance.instanceId }` : '';
          const moduleNodeId: string = module.id.toString() + instanceSuffix;
          
          // Human-readable label: "ModuleName" or "ModuleName (2)" for duplicates
          const sameModuleInstances = instancesByModule.get(instance.moduleId) ?? [];
          const instanceNumber = instanceOrderByKey.get(
            this.moduleInstanceKey(instance.moduleId, instance.instanceId)
          ) ?? 1;
          const moduleLabel = sameModuleInstances.length > 1
            ? `${ module.name } (${ instanceNumber })`
            : module.name;
          
          const moduleNode: GraphNode = {
            id: moduleNodeId,
            label: moduleLabel,
            color: this.legend[0].color,
            size: sizeConstant * 7.5,
            x: 1,
            y: 1,
            data: {type: 'module', module, moduleNodeId}
          };
          
          nodesDictionary[moduleNode.id] = moduleNode;
          
          const outNodes: GraphNode[] = module.outs.map(jack => ({
            id: moduleNodeId + jack.id,
            color: this.legend[1].color,
            size: sizeConstant * 5,
            x: 1, y: 1,
            label: `${ jack.name }`,
            data: {type: 'cv-out', module, parentModuleNodeId: moduleNodeId}
          }));
          
          const inNodes: GraphNode[] = module.ins.map(jack => ({
            id: moduleNodeId + jack.id,
            color: this.legend[2].color,
            size: sizeConstant * 5,
            x: 1, y: 1,
            label: `${ jack.name }`,
            data: {type: 'cv-in', module, parentModuleNodeId: moduleNodeId}
          }));
          outNodes.forEach(node => allModuleJackNodes[node.id] = node);
          inNodes.forEach(node => allModuleJackNodes[node.id] = node);
          
          const insEdges: GraphEdge[] = inNodes.map(n => ({
            id: n.id, from: n.id, to: moduleNodeId,
            label: '',
            color: this.moduleJackEdgeColor,
            size: sizeConstant * 1.15,
            weight: 8,
            type: 'arrow',
            data: {stage: 'cv-in-to-module'}
          }));
          const outsEdges: GraphEdge[] = outNodes.map(n => ({
            id: n.id, from: moduleNodeId, to: n.id,
            label: '',
            color: this.moduleJackEdgeColor,
            size: sizeConstant * 1.15,
            weight: 8,
            type: 'arrow',
            data: {stage: 'module-to-cv-out'}
          }));
          
          insEdges.forEach(edge => allModuleJackEdges[edge.id] = edge);
          outsEdges.forEach(edge => allModuleJackEdges[edge.id] = edge);
        });
        
        connections.forEach(connection => {
          const suffixA = connection.instance_id_a != null ? `_${ connection.instance_id_a }` : '';
          const suffixB = connection.instance_id_b != null ? `_${ connection.instance_id_b }` : '';
          const moduleNodeIdA = connection.a.module.id.toString() + suffixA;
          const moduleNodeIdB = connection.b.module.id.toString() + suffixB;
          const cvNodeIdA = connection.a.module.id.toString() + suffixA + connection.a.id;
          if (!nodesDictionary[cvNodeIdA]) {
            nodesDictionary[cvNodeIdA] = allModuleJackNodes[cvNodeIdA]
              ?? this.buildNode(cvNodeIdA, connection.a, '#E2523C', sizeConstant, moduleNodeIdA);
          }
          const cvNodeIdB = connection.b.module.id.toString() + suffixB + connection.b.id;
          if (!nodesDictionary[cvNodeIdB]) {
            nodesDictionary[cvNodeIdB] = allModuleJackNodes[cvNodeIdB]
              ?? this.buildNode(cvNodeIdB, connection.b, '#4483F2', sizeConstant, moduleNodeIdB);
          }
        });
        
        const routeOccurrenceByKey = new Map<string, number>();
        const patchEdges: GraphEdge[] = connections.map(connection => {
          const suffixA = connection.instance_id_a != null ? `_${ connection.instance_id_a }` : '';
          const suffixB = connection.instance_id_b != null ? `_${ connection.instance_id_b }` : '';
          const from = connection.a.module.id + suffixA + connection.a.id.toString();
          const to = connection.b.module.id + suffixB + connection.b.id.toString();
          const routeKey = `${ from }->${ to }`;
          const occurrence = (routeOccurrenceByKey.get(routeKey) ?? 0) + 1;
          routeOccurrenceByKey.set(routeKey, occurrence);
          return {
            id: `patch:${ routeKey }#${ occurrence }`, from, to,
            type: 'arrow',
            color: this.patchCableBaseColor,
            size: sizeConstant * 1.85,
            weight: 1.2,
            x: 1,
            y: 1,
            label: `${ connection.notes ?? '' }`,
            data: {stage: 'cv-out-to-cv-in'}
          };
        });
        
        const moduleBridgeEdgeMap = new Map<string, GraphEdge>();
        connections.forEach(connection => {
          const suffixA = connection.instance_id_a != null ? `_${ connection.instance_id_a }` : '';
          const suffixB = connection.instance_id_b != null ? `_${ connection.instance_id_b }` : '';
          const moduleFrom = connection.a.module.id.toString() + suffixA;
          const moduleTo = connection.b.module.id.toString() + suffixB;
          if (moduleFrom === moduleTo) { return; }
          
          const key = `${ moduleFrom }->${ moduleTo }`;
          if (moduleBridgeEdgeMap.has(key)) { return; }
          
          moduleBridgeEdgeMap.set(key, {
            id: `module-bridge:${ key }`,
            from: moduleFrom,
            to: moduleTo,
            label: '',
            color: 'rgba(0, 0, 0, 0)',
            size: sizeConstant * 1.45,
            weight: 0.15,
            type: 'arrow',
            data: {stage: 'module-bridge', hidden: true}
          });
        });
        const moduleBridgeEdges = Array.from(moduleBridgeEdgeMap.values());
        
        const usedCvNodeIds = new Set<string>();
        patchEdges.forEach(edge => {
          usedCvNodeIds.add(edge.from);
          usedCvNodeIds.add(edge.to);
        });
        const onlyUsedModuleJacksEdges: GraphEdge[] = Object.values(allModuleJackEdges)
          .filter(edge => usedCvNodeIds.has(edge.from) || usedCvNodeIds.has(edge.to));
        
        const orderedNodes = this.orderNodesForReveal(Object.values(nodesDictionary).filter(Boolean));
        const orderedEdges = [...moduleBridgeEdges, ...onlyUsedModuleJacksEdges, ...patchEdges];
        
        if (this.progressiveRender || this.animateGraphBuild) {
          this.revealGraphProgressively(orderedNodes, orderedEdges);
        } else {
          this.nodes$.next(orderedNodes);
          this.edges$.next(orderedEdges);
        }

        this._graphBuiltOnce = true;
        const el = this.graphContainer?.nativeElement;
        if (el) { el.style.height = ''; }
      });
  }
  
  override ngOnDestroy(): void {
    this.cancelProgressiveReveal();
    super.ngOnDestroy();
  }
  
  refreshNow(): void {
    this._manualRefresh$.next();
  }
  
  private buildNode(
    nodeId: string,
    CV: CVwithModule,
    color: string,
    sizeConstant: number,
    parentModuleNodeId: string
  ): GraphNode {
    const type = color === this.legend[1].color ? 'cv-out' : 'cv-in';
    return {
      id: nodeId,
      label: `${ CV.name }`,
      color,
      size: sizeConstant * 4,
      x: 1, y: 1,
      data: {type, module: CV.module, parentModuleNodeId}
    };
  }

  private computeSizeConstant(modulesCount: number, connectionsCount: number): number {
    if (modulesCount <= 0 || connectionsCount <= 0) {
      return this.baseSizeConstant;
    }

    const ratio = (modulesCount / connectionsCount) / 1.5;
    const scaled = this.baseSizeConstant * ratio;
    return Math.max(1.5, Math.min(6, scaled));
  }
  
  /** Extract unique (moduleId, instanceId) pairs from patch connections. */
  private extractModuleInstances(connections: PatchConnection[]): ModuleInstance[] {
    const seen = new Map<string, ModuleInstance>();
    const add = (moduleId: number, instanceId: number | undefined) => {
      const key = this.moduleInstanceKey(moduleId, instanceId);
      if (!seen.has(key)) { seen.set(key, {moduleId, instanceId}); }
    };
    connections.forEach(c => {
      add(c.a.module.id, c.instance_id_a);
      add(c.b.module.id, c.instance_id_b);
    });
    return Array.from(seen.values());
  }
  
  private moduleInstanceKey(moduleId: number, instanceId: number | undefined): string {
    return `${ moduleId }_${ instanceId ?? 'none' }`;
  }
  
  private revealGraphProgressively(nodes: GraphNode[], edges: GraphEdge[]): void {
    this.cancelProgressiveReveal();
    this.revealRunId++;
    const runId = this.revealRunId;
    
    if (nodes.length === 0) {
      this.nodes$.next([]);
      this.edges$.next([]);
      return;
    }
    
    const modules = nodes.filter(node => node.data?.type === 'module');
    const cvOutNodes = nodes.filter(node => node.data?.type === 'cv-out');
    const cvInNodes = nodes.filter(node => node.data?.type === 'cv-in');
    const remainingNodes = nodes.filter(node =>
      node.data?.type !== 'module'
      && node.data?.type !== 'cv-out'
      && node.data?.type !== 'cv-in'
    );
    const visibleNodes: GraphNode[] = [...modules];
    const visibleNodeIds = new Set<string>();
    modules.forEach(node => visibleNodeIds.add(node.id));
    const nodeIds = new Set(nodes.map(node => node.id));
    const revealableEdges = edges.filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to));
    const moduleBridgeEdges = revealableEdges.filter(edge => edge.data?.stage === 'module-bridge');
    const moduleToCvOutEdges = revealableEdges.filter(edge => edge.data?.stage === 'module-to-cv-out');
    const cvInToModuleEdges = revealableEdges.filter(edge => edge.data?.stage === 'cv-in-to-module');
    const patchConnectionEdges = revealableEdges.filter(edge => edge.data?.stage === 'cv-out-to-cv-in');
    const remainingEdges = revealableEdges.filter(edge =>
      edge.data?.stage !== 'module-bridge'
      && edge.data?.stage !== 'module-to-cv-out'
      && edge.data?.stage !== 'cv-in-to-module'
      && edge.data?.stage !== 'cv-out-to-cv-in'
    );
    const edgeStageDelayMs = 420;
    const stageDelayMs = 480;
    const visibleEdges: GraphEdge[] = [];
    const visibleEdgeIds = new Set<string>();
    
    moduleBridgeEdges
      .filter(edge => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to))
      .forEach(edge => {
        visibleEdges.push({
          ...edge,
          color: this.stageBridgeColor,
          data: {
            ...(edge.data ?? {}),
            hidden: false
          }
        });
        visibleEdgeIds.add(edge.id);
      });
    
    this.nodes$.next([...visibleNodes]);
    this.edges$.next([...visibleEdges]);
    
    let layerStartDelay = 0;
    const revealLayer = (layerNodes: GraphNode[], layerEdges: GraphEdge[], delayMs: number) => {
      layerStartDelay += delayMs;
      const timer = setTimeout(() => {
        if (runId !== this.revealRunId) { return; }
        
        let changed = false;
        layerNodes.forEach(node => {
          if (visibleNodeIds.has(node.id)) { return; }
          visibleNodes.push(node);
          visibleNodeIds.add(node.id);
          changed = true;
        });
        
        layerEdges.forEach(edge => {
          if (visibleEdgeIds.has(edge.id)) { return; }
          if (!visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to)) { return; }
          visibleEdges.push(edge);
          visibleEdgeIds.add(edge.id);
          changed = true;
        });
        
        if (changed) {
          this.nodes$.next([...visibleNodes]);
          this.edges$.next([...visibleEdges]);
        }
      }, layerStartDelay);
      this.revealTimers.push(timer);
    };
    
    const hideModuleBridgeEdges = (): boolean => {
      let changed = false;
      for (let index = 0; index < visibleEdges.length; index++) {
        const edge = visibleEdges[index];
        if (edge.data?.stage !== 'module-bridge') { continue; }
        if (edge.data?.hidden) { continue; }
        visibleEdges[index] = {
          ...edge,
          color: 'rgba(0, 0, 0, 0)',
          data: {
            ...(edge.data ?? {}),
            hidden: true
          }
        };
        changed = true;
      }
      return changed;
    };
    
    revealLayer(cvOutNodes, moduleToCvOutEdges, stageDelayMs);
    revealLayer([...cvInNodes, ...remainingNodes], [...cvInToModuleEdges, ...remainingEdges], stageDelayMs);
    layerStartDelay += edgeStageDelayMs;
    const patchRoutingTimer = setTimeout(() => {
      if (runId !== this.revealRunId) { return; }
      
      let changed = false;
      patchConnectionEdges.forEach(edge => {
        if (visibleEdgeIds.has(edge.id)) { return; }
        if (!visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to)) { return; }
        visibleEdges.push(edge);
        visibleEdgeIds.add(edge.id);
        changed = true;
      });
      
      if (hideModuleBridgeEdges()) {
        changed = true;
      }
      
      if (changed) {
        this.edges$.next([...visibleEdges]);
      }
    }, layerStartDelay);
    this.revealTimers.push(patchRoutingTimer);
    
    const flowStartDelay = layerStartDelay + 260;
    const flowTimer = setTimeout(() => {
      if (runId !== this.revealRunId) { return; }
      const ioFlowEdges = [...moduleToCvOutEdges, ...patchConnectionEdges, ...cvInToModuleEdges];
      const flowEdges = ioFlowEdges.length > 0
        ? ioFlowEdges
        : revealableEdges.filter(edge => !edge.data?.hidden);
      this.startPersistentFlowAnimation([...visibleEdges], flowEdges);
    }, flowStartDelay);
    this.revealTimers.push(flowTimer);
  }
  
  private cancelProgressiveReveal(): void {
    this.revealRunId++;
    this.revealTimers.forEach(timer => clearTimeout(timer));
    this.revealTimers = [];
    this.stopPersistentFlowAnimation();
  }
  
  private orderNodesForReveal(nodes: GraphNode[]): GraphNode[] {
    const modules = nodes.filter(node => node.data?.type === 'module');
    if (modules.length === 0) {
      const total = Math.max(1, nodes.length);
      const radius = Math.max(2.2, Math.min(7.5, 2 + total / 8));
      return nodes.map((node, index) => {
        const angle = (index / total) * Math.PI * 2;
        return {
          ...node,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        };
      });
    }
    
    const moduleIds = new Set(modules.map(node => node.id));
    const childNodesByModule = new Map<string, GraphNode[]>();
    const ungroupedNodes: GraphNode[] = [];
    
    nodes.forEach(node => {
      if (node.data?.type === 'module') { return; }
      const parentModuleNodeId = node.data?.parentModuleNodeId as string | undefined;
      if (parentModuleNodeId && moduleIds.has(parentModuleNodeId)) {
        const list = childNodesByModule.get(parentModuleNodeId) ?? [];
        list.push(node);
        childNodesByModule.set(parentModuleNodeId, list);
        return;
      }
      ungroupedNodes.push(node);
    });
    
    const moduleTotal = Math.max(1, modules.length);
    const moduleRingRadius = Math.max(3.6, Math.min(9, 3.1 + moduleTotal * 0.55));
    const modulePositions = new Map<string, {
      x: number,
      y: number,
      angle: number
    }>();
    const orderedNodes: GraphNode[] = [];
    
    modules.forEach((moduleNode, index) => {
      const angle = (index / moduleTotal) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * moduleRingRadius;
      const y = Math.sin(angle) * moduleRingRadius;
      modulePositions.set(moduleNode.id, {x, y, angle});
      orderedNodes.push({...moduleNode, x, y});
    });
    
    modules.forEach(moduleNode => {
      const position = modulePositions.get(moduleNode.id);
      if (!position) { return; }
      
      const childNodes = [...(childNodesByModule.get(moduleNode.id) ?? [])].sort((a, b) => {
        const typeOrderA = a.data?.type === 'cv-out' ? 0 : 1;
        const typeOrderB = b.data?.type === 'cv-out' ? 0 : 1;
        if (typeOrderA !== typeOrderB) { return typeOrderA - typeOrderB; }
        return a.label.localeCompare(b.label);
      });
      if (childNodes.length === 0) { return; }
      
      const orbitRadius = Math.max(1, Math.min(2.1, 0.9 + childNodes.length * 0.09));
      const outNodes = childNodes.filter(node => node.data?.type === 'cv-out');
      const inNodes = childNodes.filter(node => node.data?.type === 'cv-in');
      
      const placeOnArc = (arcNodes: GraphNode[], centerAngle: number) => {
        if (arcNodes.length === 0) { return; }
        const arcSpread = Math.min(Math.PI * 0.95, 0.62 + arcNodes.length * 0.17);
        arcNodes.forEach((node, index) => {
          const t = arcNodes.length === 1
            ? 0
            : (index / (arcNodes.length - 1)) - 0.5;
          const angle = centerAngle + t * arcSpread;
          orderedNodes.push({
            ...node,
            x: position.x + Math.cos(angle) * orbitRadius,
            y: position.y + Math.sin(angle) * orbitRadius
          });
        });
      };
      
      // Keep outs slightly toward the outside of the module ring, ins toward the inside.
      placeOnArc(outNodes, position.angle);
      placeOnArc(inNodes, position.angle + Math.PI);
    });
    
    const ungroupedTotal = Math.max(1, ungroupedNodes.length);
    const ungroupedRadius = Math.max(1.2, Math.min(3.4, 1.3 + ungroupedTotal * 0.2));
    ungroupedNodes.forEach((node, index) => {
      const angle = (index / ungroupedTotal) * Math.PI * 2;
      orderedNodes.push({
        ...node,
        x: Math.cos(angle) * ungroupedRadius,
        y: Math.sin(angle) * ungroupedRadius
      });
    });
    
    return orderedNodes;
  }
  
  private startPersistentFlowAnimation(edges: GraphEdge[], preferredFlowEdges: GraphEdge[]): void {
    this.stopPersistentFlowAnimation();
    if (edges.length === 0) { return; }
    
    const baseEdges = edges.map(edge => ({
      ...edge,
      color: this.baseColorForEdge(edge)
    }));
    const preferredFlowEdgeIds = new Set(preferredFlowEdges.map(edge => edge.id));
    const flowPoolEdges = baseEdges.filter(edge =>
      !edge.data?.hidden && preferredFlowEdgeIds.has(edge.id)
    );
    const resolvedFlowPool = flowPoolEdges.length > 0
      ? flowPoolEdges
      : baseEdges.filter(edge => !edge.data?.hidden);
    const outgoingByNode = new Map<string, GraphEdge[]>();
    resolvedFlowPool.forEach(edge => {
      const list = outgoingByNode.get(edge.from) ?? [];
      list.push(edge);
      outgoingByNode.set(edge.from, list);
    });
    
    this.flowState = {
      baseEdges,
      flowPoolEdges: resolvedFlowPool,
      outgoingByNode,
      currentNodeId: resolvedFlowPool[0]?.to,
      edgeHeatById: new Map<string, number>(),
      tickCount: 0
    };
    
    this.injectFlowPulse();
    this.emitFlowStyledEdges();
    this.flowInterval = setInterval(() => {
      this.advanceFlowStep();
    }, 55);
  }
  
  private stopPersistentFlowAnimation(): void {
    if (this.flowInterval) {
      clearInterval(this.flowInterval);
      this.flowInterval = undefined;
    }
    this.flowState = undefined;
  }
  
  private advanceFlowStep(): void {
    if (!this.flowState) { return; }
    this.flowState.tickCount += 1;
    this.decayFlowHeat();
    if (this.flowState.tickCount % 2 === 0) {
      this.injectFlowPulse();
    }
    
    this.emitFlowStyledEdges();
  }
  
  private emitFlowStyledEdges(): void {
    if (!this.flowState) { return; }
    
    const styledEdges = this.flowState.baseEdges.map(edge => {
      if (edge.data?.hidden) {
        return {
          ...edge,
          color: 'rgba(0, 0, 0, 0)',
          data: {
            ...(edge.data ?? {}),
            flowHeat: 0
          }
        };
      }
      const heat = this.flowState?.edgeHeatById.get(edge.id) ?? 0;
      // High heat = leading edge of the directed pulse, low heat = older tail.
      const flowColor = this.interpolateHexColor(this.flowEndColor, this.flowStartColor, Math.min(1, heat));
      return {
        ...edge,
        color: heat > 0.01
          ? flowColor
          : this.baseColorForEdge(edge),
        size: edge.size * (0.95 + heat * 0.62),
        data: {
          ...(edge.data ?? {}),
          flowHeat: heat
        }
      };
    });
    
    this.edges$.next(styledEdges);
  }
  
  private injectFlowPulse(): void {
    if (!this.flowState) { return; }
    const {flowPoolEdges, outgoingByNode, edgeHeatById} = this.flowState;
    if (flowPoolEdges.length === 0) { return; }
    
    const sourceNodeId = this.flowState.currentNodeId;
    const outgoing = sourceNodeId ? outgoingByNode.get(sourceNodeId) ?? [] : [];
    const pool = outgoing.length > 0 ? outgoing : flowPoolEdges;
    const nextEdge = pool[Math.floor(Math.random() * pool.length)];
    if (!nextEdge) { return; }
    
    this.flowState.currentNodeId = nextEdge.to;
    const current = edgeHeatById.get(nextEdge.id) ?? 0;
    edgeHeatById.set(nextEdge.id, Math.min(1, current + 0.72));
  }
  
  private decayFlowHeat(): void {
    if (!this.flowState) { return; }
    const nextHeatById = new Map<string, number>();
    this.flowState.edgeHeatById.forEach((heat, edgeId) => {
      const decayed = heat * 0.87;
      if (decayed > 0.03) {
        nextHeatById.set(edgeId, decayed);
      }
    });
    this.flowState.edgeHeatById = nextHeatById;
  }
  
  private baseColorForEdge(edge: GraphEdge): string {
    if (edge.data?.hidden) {
      return 'rgba(0, 0, 0, 0)';
    }
    
    if (edge.data?.stage === 'module-to-cv-out' || edge.data?.stage === 'cv-in-to-module') {
      return this.moduleJackEdgeColor;
    }
    
    return this.flowBaseColor;
  }
  
  private interpolateHexColor(fromHex: string, toHex: string, t: number): string {
    const from = this.hexToRgb(fromHex);
    const to = this.hexToRgb(toHex);
    const clamped = Math.max(0, Math.min(1, t));
    const r = Math.round(from.r + (to.r - from.r) * clamped);
    const g = Math.round(from.g + (to.g - from.g) * clamped);
    const b = Math.round(from.b + (to.b - from.b) * clamped);
    return `rgb(${ r }, ${ g }, ${ b })`;
  }
  
  private hexToRgb(hex: string): {
    r: number,
    g: number,
    b: number
  } {
    const value = hex.replace('#', '');
    const normalized = value.length === 3
      ? value.split('').map(char => char + char).join('')
      : value;
    const parsed = Number.parseInt(normalized, 16);
    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255
    };
  }
}
