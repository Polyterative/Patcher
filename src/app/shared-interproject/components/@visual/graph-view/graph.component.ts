import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild
} from '@angular/core';

import Graph                                                  from 'graphology';
import erdosRenyi                                             from 'graphology-generators/random/erdos-renyi';
import FA2LayoutSupervisor, { FA2LayoutSupervisorParameters } from 'graphology-layout-forceatlas2/worker';
import circularLayout                                         from 'graphology-layout/circular';
import { Sigma }                                              from 'sigma';
import { GraphViewService }                                   from './graph-view.service';

@Component({
  selector:    'lib-graph',
  templateUrl: './graph.component.html',
  styleUrls:   ['./graph.component.scss']
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphComponent implements OnInit {
  
  // @Input() nodes: Node[] = [];
  
  // @Input() clusters: ClusterNode[] = [];
  //
  // @Input() links: Edge[] = [];
  
  @ViewChild('container') container: ElementRef | null = null;
  @Input('graph') graph: Graph = new Graph();
  sigma?: Sigma;
  @Input() settings: FA2LayoutSupervisorParameters = {};
  fa2?: FA2LayoutSupervisor;
  
  constructor(
    public dataService: GraphViewService,
    private cd: ChangeDetectorRef
  ) {
    this.graph = erdosRenyi(Graph, {
      order:       50,
      probability: 0.1
    });
    circularLayout.assign(this.graph);
    
    // sigma.js graph height
    
  }
  
  ngOnInit() {
    this.cd.detectChanges();
  }
  
  ngAfterViewInit(): void {
    if (this.container) {
      this.sigma = new Sigma(this.graph, this.container.nativeElement);
      
      this.fa2 = new FA2LayoutSupervisor(this.graph, this.settings);
      
      this.fa2.start();
      
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
