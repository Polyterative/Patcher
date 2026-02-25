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
  private readonly flowStartColor = '#B9FFF2';
  private readonly flowEndColor = '#1FCBA2';
  private readonly flowBaseColor = '#93A0B1';

  legend = [
    {label: 'Module', color: '#8974E4'},
    {label: 'CV out', color: '#E2523C'},
    {label: 'CV in', color: '#4483F2'}
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
    // Mark graph stale on any editorConnections$ change, but only after the
    // first build has completed (guards against false-stale on initial data load)
    this.patchDetailDataService.editorConnections$
      .pipe(
        filter(() => this._graphBuiltOnce),
        filter(Boolean),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this._isStale$.next(true));
    
    const autoRefresh$ = this.patchDetailDataService.editorConnections$.pipe(
      filter(() => this._graphBuiltOnce),
      filter(Boolean),
      debounceTime(3000)
    );
    
    const manualRefresh$ = this._manualRefresh$.pipe(
      withLatestFrom(this.patchDetailDataService.editorConnections$),
      map(([, connections]) => connections),
      filter(Boolean)
    );
    
    merge(
      this.patchDetailDataService.patchConnections$.pipe(filter(Boolean)),
      autoRefresh$,
      manualRefresh$
    )
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
        const allModuleJackEdges: {
          [id: string]: GraphEdge
        } = {};

        // Build a lookup from module id → DbModule
        const moduleLookup = new Map<number, DbModule>(modules.map(m => [m.id, m]));

        // Enumerate unique instances: (moduleId, instanceId)
        const instances = this.extractModuleInstances(connections);
        
        instances.forEach(instance => {
          const module = moduleLookup.get(instance.moduleId);
          if (!module) { return; }
          
          const instanceSuffix = instance.instanceId != null ? `_${ instance.instanceId }` : '';
          const moduleNodeId: string = module.id.toString() + instanceSuffix;
          
          // Human-readable label: "ModuleName" or "ModuleName (2)" for duplicates
          const sameModuleInstances = instances.filter(i => i.moduleId === instance.moduleId);
          const instanceNumber = sameModuleInstances
            .findIndex(i => i.instanceId === instance.instanceId) + 1;
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
            data: {type: 'module', module}
          };
          
          nodesDictionary[moduleNode.id] = moduleNode;
          
          const outNodes: GraphNode[] = module.outs.map(jack => ({
            id: moduleNodeId + jack.id,
            color: this.legend[1].color,
            size: sizeConstant * 5,
            x: 1, y: 1,
            label: `${ module.name } ${ jack.name }`,
            data: {type: 'cv-out', module}
          }));
          
          const inNodes: GraphNode[] = module.ins.map(jack => ({
            id: moduleNodeId + jack.id,
            color: this.legend[2].color,
            size: sizeConstant * 5,
            x: 1, y: 1,
            label: `${ module.name } ${ jack.name }`,
            data: {type: 'cv-in', module}
          }));
          
          const insEdges: GraphEdge[] = inNodes.map(n => ({
            id: n.id, from: n.id, to: moduleNodeId,
            label: '', color: '#c0c0c0', size: sizeConstant, type: 'arrow'
          }));
          const outsEdges: GraphEdge[] = outNodes.map(n => ({
            id: n.id, from: moduleNodeId, to: n.id,
            label: '', color: '#c0c0c0', size: sizeConstant, type: 'arrow'
          }));
          
          insEdges.forEach(edge => allModuleJackEdges[edge.id] = edge);
          outsEdges.forEach(edge => allModuleJackEdges[edge.id] = edge);
        });
        
        connections.forEach(connection => {
          const suffixA = connection.instance_id_a != null ? `_${ connection.instance_id_a }` : '';
          const suffixB = connection.instance_id_b != null ? `_${ connection.instance_id_b }` : '';
          const cvNodeIdA = connection.a.module.id.toString() + suffixA + connection.a.id;
          if (!nodesDictionary[cvNodeIdA]) {
            nodesDictionary[cvNodeIdA] = this.buildNode(cvNodeIdA, connection.a, '#E2523C', sizeConstant);
          }
          const cvNodeIdB = connection.b.module.id.toString() + suffixB + connection.b.id;
          if (!nodesDictionary[cvNodeIdB]) {
            nodesDictionary[cvNodeIdB] = this.buildNode(cvNodeIdB, connection.b, '#4483F2', sizeConstant);
          }
        });
        
        const patchEdges: GraphEdge[] = connections.map(connection => {
          const suffixA = connection.instance_id_a != null ? `_${ connection.instance_id_a }` : '';
          const suffixB = connection.instance_id_b != null ? `_${ connection.instance_id_b }` : '';
          const from = connection.a.module.id + suffixA + connection.a.id.toString();
          const to = connection.b.module.id + suffixB + connection.b.id.toString();
          return {
            id: from + to, from, to,
            type: 'arrow', color: '#c0c0c0',
            size: sizeConstant * 2, x: 1, y: 1,
            label: `${ connection.notes ?? '' }`
          };
        });
        
        const onlyUsedModuleJacksEdges: GraphEdge[] = Object.values(allModuleJackEdges)
          .filter(link => patchEdges.some(
            e => e.from === link.from || e.to === link.to
              || e.from === link.to || e.to === link.from
          ));
        
        const orderedNodes = this.orderNodesForReveal(Object.values(nodesDictionary).filter(Boolean));
        const orderedEdges = [...onlyUsedModuleJacksEdges, ...patchEdges];
        
        if (this.progressiveRender) {
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

  private buildNode(nodeId: string, CV: CVwithModule, color: string, sizeConstant: number): GraphNode {
    const type = color === this.legend[1].color ? 'cv-out' : 'cv-in';
    return {
      id: nodeId,
      label: `${ CV.name }`,
      color,
      size: sizeConstant * 4,
      x: 1, y: 1,
      data: {type, module: CV.module}
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
      const key = `${ moduleId }_${ instanceId ?? 'none' }`;
      if (!seen.has(key)) { seen.set(key, {moduleId, instanceId}); }
    };
    connections.forEach(c => {
      add(c.a.module.id, c.instance_id_a);
      add(c.b.module.id, c.instance_id_b);
    });
    return Array.from(seen.values());
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
    const edgeStageDelayMs = 420;
    const stageDelayMs = 480;
    
    this.nodes$.next([...visibleNodes]);
    this.edges$.next([]);
    
    let layerStartDelay = 0;
    const revealLayer = (layerNodes: GraphNode[]) => {
      layerStartDelay += stageDelayMs;
      if (layerNodes.length === 0) { return; }
      const timer = setTimeout(() => {
        if (runId !== this.revealRunId) { return; }
        layerNodes.forEach(node => {
          if (visibleNodeIds.has(node.id)) { return; }
          visibleNodes.push(node);
          visibleNodeIds.add(node.id);
        });
        this.nodes$.next([...visibleNodes]);
      }, layerStartDelay);
      this.revealTimers.push(timer);
    };
    
    revealLayer(cvOutNodes);
    revealLayer([...cvInNodes, ...remainingNodes]);
    
    const edgesDelay = layerStartDelay + edgeStageDelayMs;
    const edgesStageTimer = setTimeout(() => {
      if (runId !== this.revealRunId) { return; }
      const visibleEdges = revealableEdges.filter(edge =>
        visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)
      );
      this.edges$.next(visibleEdges);
    }, edgesDelay);
    this.revealTimers.push(edgesStageTimer);
    
    const flowStartDelay = edgesDelay + 260;
    const flowTimer = setTimeout(() => {
      if (runId !== this.revealRunId) { return; }
      this.startPersistentFlowAnimation(revealableEdges);
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
    const others = nodes.filter(node => node.data?.type !== 'module');
    const ordered = [...modules, ...others];
    const total = Math.max(1, ordered.length);
    const radius = Math.max(2.2, Math.min(7.5, 2 + total / 8));
    
    return ordered.map((node, index) => {
      const angle = (index / total) * Math.PI * 2;
      return {
        ...node,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      };
    });
  }
  
  private startPersistentFlowAnimation(edges: GraphEdge[]): void {
    this.stopPersistentFlowAnimation();
    if (edges.length === 0) { return; }
    
    const baseEdges = edges.map(edge => ({...edge, color: this.flowBaseColor}));
    const outgoingByNode = new Map<string, GraphEdge[]>();
    baseEdges.forEach(edge => {
      const list = outgoingByNode.get(edge.from) ?? [];
      list.push(edge);
      outgoingByNode.set(edge.from, list);
    });
    
    this.flowState = {
      baseEdges,
      outgoingByNode,
      currentNodeId: baseEdges[0]?.to,
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
      const heat = this.flowState?.edgeHeatById.get(edge.id) ?? 0;
      // High heat = leading edge of the directed pulse, low heat = older tail.
      const flowColor = this.interpolateHexColor(this.flowEndColor, this.flowStartColor, Math.min(1, heat));
      return {
        ...edge,
        color: heat > 0.01
          ? flowColor
          : this.flowBaseColor,
        size: edge.size * (0.95 + heat * 0.78)
      };
    });
    
    this.edges$.next(styledEdges);
  }
  
  private injectFlowPulse(): void {
    if (!this.flowState) { return; }
    const {baseEdges, outgoingByNode, edgeHeatById} = this.flowState;
    if (baseEdges.length === 0) { return; }
    
    const sourceNodeId = this.flowState.currentNodeId;
    const outgoing = sourceNodeId ? outgoingByNode.get(sourceNodeId) ?? [] : [];
    const pool = outgoing.length > 0 ? outgoing : baseEdges;
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