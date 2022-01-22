import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnInit,
  ViewChild
} from '@angular/core';

import Graph                                                  from 'graphology';
import FA2LayoutSupervisor, { FA2LayoutSupervisorParameters } from 'graphology-layout-forceatlas2/worker';
// import erdosRenyi                                             from 'graphology-generators/random/erdos-renyi';
// import FA2LayoutSupervisor, { FA2LayoutSupervisorParameters } from 'graphology-layout-forceatlas2/worker';
import circularLayout                                         from 'graphology-layout/circular';

import { Sigma }            from 'sigma';
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
  selector:    'lib-graph',
  templateUrl: './graph.component.html',
  styleUrls:   ['./graph.component.scss']
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphComponent implements OnInit {
  
  @Input() nodes: GraphNode[] = [];
  
  @Input() edges: GraphEdge[] = [];
  
  @ViewChild('container') container: ElementRef | null = null;
  // Type and declare internal state:
  
  state: State = {searchQuery: ''};
  @Input('graph') graph: Graph = new Graph({
    type: 'directed',
    // multi:          true,
    allowSelfLoops: true
  });
  
  renderer?: Sigma;
  @Input() settings: FA2LayoutSupervisorParameters = {weighted: true};
  
  fa2?: FA2LayoutSupervisor;
  loaded = false;
  
  constructor(
    public dataService: GraphViewService,
    private cd: ChangeDetectorRef,
    private zone: NgZone
  ) {
    // this.graph = erdosRenyi(Graph, {
    //   order:       50,
    //   probability: 0.1
    // });
    // circularLayout.assign(this.graph);
    
    // sigma.js graph height
    
  }
  
  ngOnInit() {
    // const renderer = new Sigma(this.graph, this.container.nativeElement);
  
    this.zone.runOutsideAngular(() => {
      this.nodes.forEach(node => {
        this.graph.addNode(node.id, node);
      });
    
      this.edges.forEach(link => {
        this.graph.addDirectedEdge(link.from, link.to, link);
      });
      this.loaded = true;
    
      circularLayout.assign(this.graph, {
        scale: 1000
      });
    });
  
    // console.log('nodes', this.nodes);
    // console.log('links', this.links);
  
    // circularLayout.assign(this.graph);
  
    // Displaying useful information about your graph
//     console.log('Number of nodes', this.graph.order);
//     console.log('Number of edges', this.graph.size);
    // With settings:
  
    // const sensibleSettings = forceAtlas2.inferSettings(this.graph);
    // forceAtlas2(this.graph, {
    //   iterations: 10,
    //   settings:   sensibleSettings
    // });
  
    // this.cd.detectChanges();
  
  }
  
  ngAfterViewInit(): void {
  
    this.zone.runOutsideAngular(() => {
      if (this.container) {
        this.renderer = new Sigma(this.graph, this.container.nativeElement, {
          renderLabels:               true,
          labelFont:                  'Roboto',
          renderEdgeLabels:           true,
          stagePadding:               20,
          hideLabelsOnMove:           false,
          hideEdgesOnMove:            false,
          labelGridCellSize:          10,
          labelRenderedSizeThreshold: 10
          // nodeReducer:                (node: any) => {
          //   return {
          //     ...node,
          //     label: node.label,
          //     size:  node.size,
          //     color: node.color
          //   };
          // }
        });
  
        // Bind graph interactions:
        this.renderer.on('enterNode', ({node}) => {
          this.zone.run(() => {
            this.dataService.selectedNode$.next(this.nodes.find(n => n.id === node));
          });
        });
  
        this.renderer.on('leaveNode', ({node}) => {
          this.zone.run(() => {
            this.dataService.selectedNode$.next(undefined);
          });
        });
  
        // this.sigma.refresh();
  
        this.fa2 = new FA2LayoutSupervisor(this.graph, this.settings);
  
        this.fa2.start();
  
        // turn off after 2 seconds
        setTimeout(() => {
          this.fa2.stop();
        }, 5000);
  
      }
    });
  
  }
  
  ngOnDestroy(): void {
  
    this.zone.runOutsideAngular(() => {
      if (this.renderer) {
      
        this.fa2.stop();
        this.fa2.kill();
      
        this.graph.clear();
        // this.graph.();
        this.renderer.kill();
      
        this.graph = undefined;
        this.renderer = undefined;
      
      }
    });
  
  }
}
