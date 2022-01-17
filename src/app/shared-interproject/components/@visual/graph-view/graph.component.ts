import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild
} from '@angular/core';

import Graph                                                  from 'graphology';
// import erdosRenyi                                             from 'graphology-generators/random/erdos-renyi';
// import FA2LayoutSupervisor, { FA2LayoutSupervisorParameters } from 'graphology-layout-forceatlas2/worker';
// import circularLayout                                         from 'graphology-layout/circular';
import forceAtlas2                                            from 'graphology-layout-forceatlas2';
import FA2LayoutSupervisor, { FA2LayoutSupervisorParameters } from 'graphology-layout-forceatlas2/worker';

import { Sigma }            from 'sigma';
import { GraphViewService } from './graph-view.service';

@Component({
  selector:    'lib-graph',
  templateUrl: './graph.component.html',
  styleUrls:   ['./graph.component.scss']
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphComponent implements OnInit {
  
  @Input() nodes: string[] = [];
  
  // @Input() nodes: { id:string,attributes:{
  //     x:     number,
  //     y:     number,
  //     size:  number,
  //     label: string
  //   } }[] = [];
  //
  
  // @Input() clusters: ClusterNode[] = [];
  //
  @Input() links: { start: string, end: string }[] = [];
  
  @ViewChild('container') container: ElementRef | null = null;
  @Input('graph') graph: Graph = new Graph({
    type:           'mixed',
    multi:          true,
    allowSelfLoops: true
  });
  
  sigma?: Sigma;
  @Input() settings: FA2LayoutSupervisorParameters = {weighted: true};
  
  fa2?: FA2LayoutSupervisor;
  
  constructor(
    public dataService: GraphViewService,
    private cd: ChangeDetectorRef
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
  
    // renderer.
  
    this.nodes.forEach(node => {
      this.graph.mergeNode(node, {
        key:   node,
        x:     Math.random(),
        y:     Math.random(),
        size:  20,
        label: node
      });
    });
  
    this.links.forEach(link => {
      this.graph.mergeEdge(link.start, link.end);
    });
  
    // circularLayout.assign(this.graph);

// Displaying useful information about your graph
    console.log('Number of nodes', this.graph.order);
    console.log('Number of edges', this.graph.size);
    // With settings:
  
    const sensibleSettings = forceAtlas2.inferSettings(this.graph);
    forceAtlas2(this.graph, {
      iterations: 10000,
      settings:   sensibleSettings
    });
  
    this.cd.detectChanges();
  
  }
  
  ngAfterViewInit(): void {
    if (this.container) {
      this.sigma = new Sigma(this.graph, this.container.nativeElement);
  
      this.fa2 = new FA2LayoutSupervisor(this.graph, this.settings);
  
      this.fa2.start();
  
      console.log('sigma', this.graph.inspect());
  
    }
  }
  
  ngOnDestroy(): void {
    if (this.sigma) {
      
      this.fa2.stop();
      this.fa2.kill();
      
      this.sigma.kill();
      
    }
  }
}
