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
  
  @Input('graph') graph: Graph = new Graph({
    type: 'directed',
    // multi:          true,
    allowSelfLoops: true
  });
  
  sigma?: Sigma;
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
        this.graph.mergeNode(node.id, node);
      });
    
      this.edges.forEach(link => {
        this.graph.mergeDirectedEdge(link.from, link.to, link);
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
        this.sigma = new Sigma(this.graph, this.container.nativeElement);
      
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
      if (this.sigma) {
      
        this.fa2.stop();
        this.fa2.kill();
      
        this.graph.clear();
        // this.graph.();
        this.sigma.kill();
      
        this.graph = undefined;
        this.sigma = undefined;
      
      }
    });
  
  }
}
