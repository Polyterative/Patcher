import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
}                  from '@angular/core';
import {
  ClusterNode,
  Edge,
  Layout,
  Node
}                  from '@swimlane/ngx-graph';
import { Subject } from 'rxjs';

@Component({
  selector:        'lib-graph',
  templateUrl:     './graph.component.html',
  styleUrls:       ['./graph.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphComponent implements OnInit {
  
  @Input() nodes: ClusterNode[] = [];
  // {
  //   id:    'first',
  //   label: 'A'
  // },
  // {
  //   id:    'second',
  //   label: 'B'
  // },
  // {
  //   id:    'c1',
  //   label: 'C1'
  // },
  // {
  //   id:    'c2',
  //   label: 'C2'
  // }
  
  // clusters: ClusterNode[] = [
  //   {
  //     id:           'third',
  //     label:        'C',
  //     childNodeIds: [
  //       'c1',
  //       'c2'
  //     ]
  //   }
  // ];
  
  @Input() links: Edge[] = [];
  // {
  //   id:     'a',
  //   source: 'first',
  //   target: 'second',
  //   label:  'is parent of'
  // },
  //   {
  //     id:     'b',
  //     source: 'first',
  //     target: 'c1',
  //     label:  'custom label'
  //   },
  //   {
  //     id:     'c',
  //     source: 'first',
  //     target: 'c1',
  //     label:  'custom label'
  //   },
  //   {
  //     id:     'd',
  //     source: 'first',
  //     target: 'c2',
  //     label:  'custom label'
  //   }
  // ];
  
  layout: String | Layout = 'dagreCluster';
  // layouts: any[] = [
  //   {
  //     label: 'Dagre',
  //     value: 'dagre'
  //   },
  //   {
  //     label:       'Dagre Cluster',
  //     value:       'dagreCluster',
  //     isClustered: true
  //   },
  //   {
  //     label:       'Cola Force Directed',
  //     value:       'colaForceDirected',
  //     isClustered: true
  //   },
  //   {
  //     label: 'D3 Force Directed',
  //     value: 'd3ForceDirected'
  //   }
  // ];
  
  // line interpolation
  curveType = 'Bundle';
  interpolationTypes = [
    'Bundle',
    'Cardinal',
    'Catmull Rom',
    'Linear',
    'Monotone X',
    'Monotone Y',
    'Natural',
    'Step',
    'Step After',
    'Step Before'
  ];
  
  draggingEnabled = true;
  panningEnabled = true;
  zoomEnabled = true;
  
  zoomSpeed = 0.1;
  minZoomLevel = 0.1;
  maxZoomLevel = 4;
  panOnZoom = true;
  
  autoZoom = false;
  autoCenter = false;
  
  update$: Subject<boolean> = new Subject();
  center$: Subject<boolean> = new Subject();
  zoomToFit$: Subject<boolean> = new Subject();
  
  ngOnInit() {
    // this.setInterpolationType(this.curveType);
  }
  
  // setInterpolationType(curveType) {
  //   this.curveType = curveType;
  //   if (curveType === 'Bundle') {
  //     this.curve = shape.curveBundle.beta(1);
  //   }
  //   if (curveType === 'Cardinal') {
  //     this.curve = shape.curveCardinal;
  //   }
  //   if (curveType === 'Catmull Rom') {
  //     this.curve = shape.curveCatmullRom;
  //   }
  //   if (curveType === 'Linear') {
  //     this.curve = shape.curveLinear;
  //   }
  //   if (curveType === 'Monotone X') {
  //     this.curve = shape.curveMonotoneX;
  //   }
  //   if (curveType === 'Monotone Y') {
  //     this.curve = shape.curveMonotoneY;
  //   }
  //   if (curveType === 'Natural') {
  //     this.curve = shape.curveNatural;
  //   }
  //   if (curveType === 'Step') {
  //     this.curve = shape.curveStep;
  //   }
  //   if (curveType === 'Step After') {
  //     this.curve = shape.curveStepAfter;
  //   }
  //   if (curveType === 'Step Before') {
  //     this.curve = shape.curveStepBefore;
  //   }
  // }
  
}
