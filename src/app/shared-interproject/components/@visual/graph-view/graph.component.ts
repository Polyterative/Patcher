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
  type: 'arrow' | 'curve' | 'line';
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
        renderEdgeLabels: true,
        stagePadding: 20,
        hideLabelsOnMove: false,
        hideEdgesOnMove: false,
        labelGridCellSize: 10,
        labelRenderedSizeThreshold: 10
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
    
    this.dropStaleData(incomingNodes, incomingEdges);
    this.upsertNodes(incomingNodes);
    this.upsertEdges(incomingEdges);
    
    this.applyInitialLayoutIfNeeded(incomingNodes.length);
    this.refreshLayoutLifecycle();
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
  
  private dropStaleData(nodes: GraphNode[], edges: GraphEdge[]): void {
    const nodeIds = new Set(nodes.map(node => node.id));
    const edgeIds = new Set(edges.map(edge => edge.id));
    
    this.graph.edges().forEach(edgeKey => {
      if (!edgeIds.has(edgeKey)) {
        this.graph.dropEdge(edgeKey);
      }
    });
    
    this.graph.nodes().forEach(nodeKey => {
      if (!nodeIds.has(nodeKey)) {
        this.graph.dropNode(nodeKey);
      }
    });
  }
  
  private upsertNodes(nodes: GraphNode[]): void {
    nodes.forEach(node => {
      if (this.graph.hasNode(node.id)) {
        this.graph.mergeNodeAttributes(node.id, node);
      } else {
        this.graph.addNode(node.id, node);
      }
    });
  }
  
  private upsertEdges(edges: GraphEdge[]): void {
    edges.forEach(edge => {
      if (!this.graph.hasNode(edge.from) || !this.graph.hasNode(edge.to)) {
        return;
      }
      
      if (this.graph.hasEdge(edge.id)) {
        this.graph.mergeEdgeAttributes(edge.id, edge);
        return;
      }
      
      this.graph.addDirectedEdgeWithKey(edge.id, edge.from, edge.to, edge);
    });
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

  private computeLayoutRuntimeMs(): number {
    const complexity = this.graph.order + this.graph.size;
    return Math.max(1200, Math.min(3200, 900 + complexity * 15));
  }
}