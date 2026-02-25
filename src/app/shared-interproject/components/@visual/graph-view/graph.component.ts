import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';

import Graph from 'graphology';
import FA2LayoutSupervisor, { FA2LayoutSupervisorParameters } from 'graphology-layout-forceatlas2/worker';
import circularLayout from 'graphology-layout/circular';

import { Sigma } from 'sigma';
import { GraphViewService } from './graph-view.service';


export interface GraphNode {
  id: string;
  size: number;
  label: string;
  color: string;
  data?: any;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  label: string;
  from: string;
  to: string;
  color: string;
  size: number;
  weight?: number;
  type: 'arrow' | 'curve' | 'line';
  data?: any;
}

interface State {
  hoveredNode?: string;
  searchQuery: string;

  // State derived from query:
  selectedNode?: string;
  suggestions?: Set<string>;

  // State derived from hovered node:
  hoveredNeighbors?: Set<string>;
}

@Component({
  selector: 'lib-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
  standalone: false
})
export class GraphComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() nodes: GraphNode[] = [];
  @Input() edges: GraphEdge[] = [];

  @ViewChild('container') container: ElementRef | null = null;

  state: State = {searchQuery: ''};

  @Input('graph') graph: Graph = new Graph({
    type: 'directed',
    allowSelfLoops: true
  });

  renderer?: Sigma;
  
  @Input() settings: FA2LayoutSupervisorParameters = {
    weighted: true,
    settings: {
      // Lower edge weight influence + slightly higher slowdown reduces
      // oscillation in cyclic / self-referential graphs.
      slowDown: 6,
      gravity: 1.2,
      edgeWeightInfluence: 1
    }
  };
  
  /**
   * barnesHutOptimize: Barnes Hut optimization, n2 complexity to n.ln(n)
   * gravity: Attracts nodes to the center. Prevents islands from drifting away
   * Dissuade Hubs: Distributes attraction along outbound edges. Hubs attract less and thus are pushed to the borders
   * scalingRatio: How much repulsion you want. More makes a more sparse graph
   * strongGravityMode: A stronger gravity view
   * jitterTolerance: How much swinging you allow. Above 1 discouraged. Lower gives less speed and more precision
   * verbose: Shows a progressbar of iterations completed. Also, shows time taken for different force computations
   * edgeWeightInfluence: How much influence you give to the edges weight. 0 is "no influence" and 1 is "normal"
   */
  fa2LayoutSupervisor?: FA2LayoutSupervisor;
  private fa2StopTimer?: ReturnType<typeof setTimeout>;
  private viewReady = false;
  private initialLayoutApplied = false;
  loaded = false;
  
  constructor(
    public dataService: GraphViewService,
    private cd: ChangeDetectorRef,
    private zone: NgZone
  ) {
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) {
      return;
    }
    
    if (changes['nodes'] || changes['edges']) {
      this.zone.runOutsideAngular(() => {
        this.syncGraphData();
      });
    }
  }
  
  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      if (!this.container) {
        return;
      }
      
      this.renderer = new Sigma(this.graph, this.container.nativeElement, {
        renderLabels: true,
        labelFont: 'Roboto',
        labelSize: 14,
        renderEdgeLabels: true,
        stagePadding: 20,
        hideLabelsOnMove: false,
        hideEdgesOnMove: false,
        labelGridCellSize: 10,
        labelRenderedSizeThreshold: 9,
        labelRenderer: this.renderNodeLabel
      });
      
      this.viewReady = true;
      this.syncGraphData();
    });
  }
  
  ngOnDestroy(): void {
    this.zone.runOutsideAngular(() => {
      this.clearLayoutStopTimer();
      this.fa2LayoutSupervisor?.stop();
      this.fa2LayoutSupervisor?.kill();
      this.fa2LayoutSupervisor = undefined;
      
      if (this.renderer) {
        this.graph.clear();
        this.renderer.kill();
        this.renderer = undefined;
      }
    });
  }
  
  private syncGraphData(): void {
    if (!this.renderer) {
      return;
    }
    
    const incomingNodes = this.nodes ?? [];
    const incomingEdges = this.edges ?? [];
    
    // Run all three passes explicitly.
    // Using `||` short-circuit here can skip edge upserts when node upserts change,
    // leaving the graph with visible nodes but missing connections.
    const droppedStaleData = this.dropStaleData(incomingNodes, incomingEdges);
    const nodesChanged = this.upsertNodes(incomingNodes);
    const edgesChanged = this.upsertEdges(incomingEdges);
    const topologyChanged = droppedStaleData || nodesChanged || edgesChanged;
    
    // Reapply idempotent boundary flair every sync so edge-style ticks
    // cannot wipe start/end indicators via node upserts.
    this.applyBoundaryNodeFlair();
    
    if (topologyChanged || !this.initialLayoutApplied) {
      this.applyInitialLayoutIfNeeded(incomingNodes.length);
      this.refreshLayoutLifecycle();
    }
    this.renderer.refresh();
    
    const hasData = incomingNodes.length > 0;
    if (this.loaded !== hasData) {
      this.zone.run(() => {
        this.loaded = hasData;
        this.cd.detectChanges();
      });
      
      if (hasData) {
        requestAnimationFrame(() => {
          this.renderer?.resize();
          this.renderer?.refresh();
        });
      }
    }
  }
  
  private dropStaleData(nodes: GraphNode[], edges: GraphEdge[]): boolean {
    const nodeIds = new Set(nodes.map(node => node.id));
    const edgeIds = new Set(edges.map(edge => edge.id));
    let changed = false;
    
    this.graph.edges().forEach(edgeKey => {
      if (!edgeIds.has(edgeKey)) {
        this.graph.dropEdge(edgeKey);
        changed = true;
      }
    });
    
    this.graph.nodes().forEach(nodeKey => {
      if (!nodeIds.has(nodeKey)) {
        this.graph.dropNode(nodeKey);
        changed = true;
      }
    });
    
    return changed;
  }
  
  private upsertNodes(nodes: GraphNode[]): boolean {
    let changed = false;
    nodes.forEach(node => {
      const nodeAttributes = this.cloneNodeAttributes(node);
      if (this.graph.hasNode(node.id)) {
        const existing = this.graph.getNodeAttributes(node.id) as GraphNode;
        this.graph.mergeNodeAttributes(node.id, {
          ...nodeAttributes,
          // Keep current simulation coordinates; do not snap back to input seed positions.
          x: existing.x,
          y: existing.y
        });
      } else {
        this.graph.addNode(node.id, nodeAttributes);
        changed = true;
      }
    });
    
    return changed;
  }
  
  private upsertEdges(edges: GraphEdge[]): boolean {
    let changed = false;
    edges.forEach(edge => {
      if (!this.graph.hasNode(edge.from) || !this.graph.hasNode(edge.to)) {
        return;
      }
      
      if (this.graph.hasEdge(edge.id)) {
        const [existingFrom, existingTo] = this.graph.extremities(edge.id);
        if (existingFrom !== edge.from || existingTo !== edge.to) {
          this.graph.dropEdge(edge.id);
          this.graph.addDirectedEdgeWithKey(edge.id, edge.from, edge.to, edge);
          changed = true;
          return;
        }
        this.graph.mergeEdgeAttributes(edge.id, edge);
        return;
      }
      
      this.graph.addDirectedEdgeWithKey(edge.id, edge.from, edge.to, edge);
      changed = true;
    });
    
    return changed;
  }
  
  private applyBoundaryNodeFlair(): void {
    const allEdges = this.graph.edges()
      .map(edgeKey => {
        const attrs = this.graph.getEdgeAttributes(edgeKey) as GraphEdge;
        return {edgeKey, attrs};
      });
    const visibleEdges = allEdges.filter(({attrs}) => !attrs?.data?.hidden);
    const moduleBridgeEdges = allEdges.filter(({attrs}) => attrs?.data?.stage === 'module-bridge');
    
    const getNodeLabel = (nodeKey: string): string => {
      const attrs = this.graph.getNodeAttributes(nodeKey) as GraphNode;
      return attrs?.label ?? nodeKey;
    };
    
    let anchoredStart: string | undefined;
    let anchoredEnd: string | undefined;
    
    if (moduleBridgeEdges.length > 0) {
      const moduleNodes = this.graph.nodes().filter(nodeKey => {
        const attrs = this.graph.getNodeAttributes(nodeKey) as GraphNode;
        return attrs?.data?.type === 'module';
      });
      
      const moduleInDegree = new Map<string, number>();
      const moduleOutDegree = new Map<string, number>();
      const moduleOutgoing = new Map<string, string[]>();
      
      moduleNodes.forEach(nodeKey => {
        moduleInDegree.set(nodeKey, 0);
        moduleOutDegree.set(nodeKey, 0);
        moduleOutgoing.set(nodeKey, []);
      });
      
      moduleBridgeEdges.forEach(({edgeKey}) => {
        const [from, to] = this.graph.extremities(edgeKey);
        if (!moduleInDegree.has(to) || !moduleOutDegree.has(from)) { return; }
        moduleOutDegree.set(from, (moduleOutDegree.get(from) ?? 0) + 1);
        moduleInDegree.set(to, (moduleInDegree.get(to) ?? 0) + 1);
        moduleOutgoing.set(from, [...(moduleOutgoing.get(from) ?? []), to]);
      });
      
      const sourceCandidates = moduleNodes
        .filter(nodeKey => (moduleInDegree.get(nodeKey) ?? 0) === 0 && (moduleOutDegree.get(nodeKey) ?? 0) > 0);
      const sinkCandidates = moduleNodes
        .filter(nodeKey => (moduleOutDegree.get(nodeKey) ?? 0) === 0 && (moduleInDegree.get(nodeKey) ?? 0) > 0);

      const startPool = sourceCandidates.length > 0 ? sourceCandidates : moduleNodes;
      const sinkSet = new Set(sinkCandidates);
      let bestStart: string | undefined;
      let bestEnd: string | undefined;
      let bestDistance = -1;
      let bestEndIsSink = false;
      let bestEndInDegree = -1;
      
      startPool.forEach(startNode => {
        const distances = new Map<string, number>();
        const queue: string[] = [startNode];
        distances.set(startNode, 0);

        while (queue.length > 0) {
          const current = queue.shift();
          if (!current) { continue; }
          const currentDistance = distances.get(current) ?? 0;
          (moduleOutgoing.get(current) ?? []).forEach(next => {
            if (distances.has(next)) { return; }
            distances.set(next, currentDistance + 1);
            queue.push(next);
          });
        }
        
        distances.forEach((distance, nodeKey) => {
          if (nodeKey === startNode) { return; }
          const isSink = sinkSet.has(nodeKey);
          const inDegree = moduleInDegree.get(nodeKey) ?? 0;
          const isBetter = distance > bestDistance
            || (distance === bestDistance && isSink && !bestEndIsSink)
            || (distance === bestDistance && isSink === bestEndIsSink && inDegree > bestEndInDegree)
            || (distance === bestDistance
              && isSink === bestEndIsSink
              && inDegree === bestEndInDegree
              && bestEnd != null
              && getNodeLabel(nodeKey).localeCompare(getNodeLabel(bestEnd)) < 0);
          if (isBetter) {
            bestDistance = distance;
            bestStart = startNode;
            bestEnd = nodeKey;
            bestEndIsSink = isSink;
            bestEndInDegree = inDegree;
          }
        });
      });
      
      if (bestStart && bestEnd) {
        anchoredStart = bestStart;
        anchoredEnd = bestEnd;
      } else {
        anchoredStart = [...startPool].sort((a, b) => {
          const outDiff = (moduleOutDegree.get(b) ?? 0) - (moduleOutDegree.get(a) ?? 0);
          if (outDiff !== 0) { return outDiff; }
          return getNodeLabel(a).localeCompare(getNodeLabel(b));
        })[0];
        anchoredEnd = [...(sinkCandidates.length > 0 ? sinkCandidates : moduleNodes)]
          .filter(nodeKey => nodeKey !== anchoredStart)
          .sort((a, b) => getNodeLabel(a).localeCompare(getNodeLabel(b)))[0];
      }

      if (!anchoredEnd) {
        anchoredEnd = anchoredStart;
      }
    } else {
      const boundaryEdges = visibleEdges
        .filter(({attrs}) => attrs?.data?.stage === 'cv-out-to-cv-in');
      const inDegreeByNode = new Map<string, number>();
      const outDegreeByNode = new Map<string, number>();
      const boundaryNodes = new Set<string>();
      
      this.graph.nodes().forEach(nodeKey => {
        inDegreeByNode.set(nodeKey, 0);
        outDegreeByNode.set(nodeKey, 0);
      });
      
      boundaryEdges.forEach(({edgeKey}) => {
        const [from, to] = this.graph.extremities(edgeKey);
        outDegreeByNode.set(from, (outDegreeByNode.get(from) ?? 0) + 1);
        inDegreeByNode.set(to, (inDegreeByNode.get(to) ?? 0) + 1);
        boundaryNodes.add(from);
        boundaryNodes.add(to);
      });
      
      const boundaryNodeList = Array.from(boundaryNodes);
      const selectedStart = [...boundaryNodeList]
        .filter(node => (inDegreeByNode.get(node) ?? 0) === 0 && (outDegreeByNode.get(node) ?? 0) > 0)
        .sort((a, b) => getNodeLabel(a).localeCompare(getNodeLabel(b)))[0];
      const selectedEnd = [...boundaryNodeList]
        .filter(node => (outDegreeByNode.get(node) ?? 0) === 0 && (inDegreeByNode.get(node) ?? 0) > 0)
        .sort((a, b) => getNodeLabel(a).localeCompare(getNodeLabel(b)))[0];
      
      anchoredStart = this.resolveBoundaryAnchorNode(selectedStart, 'start');
      anchoredEnd = this.resolveBoundaryAnchorNode(selectedEnd, 'end');
    }
    
    this.graph.nodes().forEach(nodeKey => {
      const attrs = this.graph.getNodeAttributes(nodeKey) as GraphNode;
      const data = (attrs.data ?? {}) as Record<string, any>;
      const boundaryBase = data['boundaryBase'] as {
        color?: string;
        size?: number;
      } | undefined;
      const isStart = anchoredStart === nodeKey;
      const isEnd = anchoredEnd === nodeKey;
      
      const baseColor = boundaryBase?.color ?? attrs.color;
      const baseSize = boundaryBase?.size ?? attrs.size;
      let flairColor = baseColor;
      let flairSize = baseSize;
      
      if (isStart) {
        flairColor = this.interpolateColor(baseColor, '#FFE888', 0.66);
        flairSize = baseSize * 1.28;
      } else if (isEnd) {
        flairColor = this.interpolateColor(baseColor, '#D6EBFF', 0.66);
        flairSize = baseSize * 1.28;
      }
      
      this.graph.mergeNodeAttributes(nodeKey, {
        color: flairColor,
        size: flairSize,
        data: {
          ...data,
          boundaryBase: {
            color: baseColor,
            size: baseSize
          },
          graphBoundary: {isStart, isEnd}
        }
      });
    });
  }
  
  private resolveBoundaryAnchorNode(nodeKey: string | undefined, kind: 'start' | 'end'): string | undefined {
    if (!nodeKey || !this.graph.hasNode(nodeKey)) {
      return undefined;
    }
    
    const attrs = this.graph.getNodeAttributes(nodeKey) as GraphNode;
    if (attrs?.data?.type === 'module') {
      return nodeKey;
    }
    
    const incidentEdges = this.graph.edges(nodeKey);
    for (const edgeKey of incidentEdges) {
      const edgeAttrs = this.graph.getEdgeAttributes(edgeKey) as GraphEdge;
      const [from, to] = this.graph.extremities(edgeKey);
      
      if (kind === 'start' && edgeAttrs?.data?.stage === 'module-to-cv-out' && to === nodeKey) {
        return from;
      }
      if (kind === 'end' && edgeAttrs?.data?.stage === 'cv-in-to-module' && from === nodeKey) {
        return to;
      }
    }
    
    return nodeKey;
  }
  
  private cloneNodeAttributes(node: GraphNode): GraphNode {
    return {
      ...node,
      data: node.data ? {...node.data} : node.data
    };
  }
  
  private applyInitialLayoutIfNeeded(incomingNodesCount: number): void {
    if (incomingNodesCount === 0) {
      this.initialLayoutApplied = false;
      return;
    }
    
    if (this.initialLayoutApplied) {
      return;
    }
    
    circularLayout.assign(this.graph, {
      scale: Math.max(1, incomingNodesCount / 20)
    });
    
    this.initialLayoutApplied = true;
  }
  
  private refreshLayoutLifecycle(): void {
    if (this.graph.order <= 1) {
      this.clearLayoutStopTimer();
      this.fa2LayoutSupervisor?.stop();
      return;
    }
    
    if (!this.fa2LayoutSupervisor) {
      this.fa2LayoutSupervisor = new FA2LayoutSupervisor(this.graph, this.settings);
    }
    
    this.fa2LayoutSupervisor.start();
    
    this.clearLayoutStopTimer();
    const layoutRuntimeMs = this.computeLayoutRuntimeMs();
    this.fa2StopTimer = setTimeout(() => {
      this.fa2LayoutSupervisor?.stop();
      this.fa2StopTimer = undefined;
    }, layoutRuntimeMs);
  }
  
  private clearLayoutStopTimer(): void {
    if (this.fa2StopTimer) {
      clearTimeout(this.fa2StopTimer);
      this.fa2StopTimer = undefined;
    }
  }
  
  private interpolateColor(fromColor: string, toColor: string, weight: number): string {
    const from = this.parseColor(fromColor);
    const to = this.parseColor(toColor);
    const t = Math.max(0, Math.min(1, weight));
    const r = Math.round(from.r + (to.r - from.r) * t);
    const g = Math.round(from.g + (to.g - from.g) * t);
    const b = Math.round(from.b + (to.b - from.b) * t);
    return `rgb(${ r }, ${ g }, ${ b })`;
  }
  
  private parseColor(color: string): {
    r: number,
    g: number,
    b: number
  } {
    const value = color.trim();
    if (value.startsWith('#')) {
      const hex = value.replace('#', '');
      const normalized = hex.length === 3
        ? hex.split('').map(char => char + char).join('')
        : hex;
      const parsed = Number.parseInt(normalized, 16);
      return {
        r: (parsed >> 16) & 255,
        g: (parsed >> 8) & 255,
        b: parsed & 255
      };
    }
    
    const rgbMatch = value.match(/rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/i);
    if (rgbMatch) {
      return {
        r: Number.parseInt(rgbMatch[1], 10),
        g: Number.parseInt(rgbMatch[2], 10),
        b: Number.parseInt(rgbMatch[3], 10)
      };
    }
    
    return {r: 128, g: 128, b: 128};
  }
  
  private renderNodeLabel(
    context: CanvasRenderingContext2D,
    data: {
      x: number,
      y: number,
      size: number,
      label?: string,
      color?: string
    },
    settings: {
      labelSize: number,
      labelFont: string,
      labelWeight: string,
      labelColor: {
        attribute?: string,
        color?: string
      }
    }
  ): void {
    if (!data?.label) {
      return;
    }
    
    const size = settings.labelSize;
    const font = settings.labelFont;
    const weight = settings.labelWeight;
    const labelColorAttribute = settings.labelColor?.attribute;
    const color = labelColorAttribute
      ? ((data as Record<string, unknown>)[labelColorAttribute] as string)
      || settings.labelColor?.color
      || '#111111'
      : settings.labelColor?.color ?? '#111111';
    const xOffset = Math.max(10, data.size * 0.85);
    const x = data.x + data.size + xOffset;
    const y = data.y + size / 3;
    
    context.save();
    context.font = `${ weight } ${ size }px ${ font }`;
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    // Subtle halo keeps labels readable when arrows run close to nodes.
    context.lineWidth = Math.max(2, size * 0.32);
    context.strokeStyle = 'rgba(255, 255, 255, 0.82)';
    context.lineJoin = 'round';
    context.strokeText(data.label, x, y);
    context.fillStyle = color;
    context.fillText(data.label, x, y);
    context.restore();
  }

  private computeLayoutRuntimeMs(): number {
    const complexity = this.graph.order + this.graph.size;
    return Math.max(1200, Math.min(3200, 900 + complexity * 15));
  }
}
