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
import { GraphViewService } from 'src/app/shared-interproject/components/@visual/graph-view/graph-view.service';
import {
  GraphEdge,
  GraphNode
} from 'src/app/shared-interproject/components/@visual/graph-view/graph.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  buildPatchGraphData,
  computePatchGraphSizeConstant,
  extractPatchGraphModuleInstances
} from './patch-graph-build.utils';
import {
  advanceFlowAnimationState,
  buildFlowStyledEdges,
  createFlowAnimationState,
  FlowAnimationState,
  interpolateHexColor,
  PatchGraphFlowPalette
} from './patch-graph-flow.utils';
import { PatchGraphRevealController } from './patch-graph-reveal.controller';
import { PatchDetailDataService } from '../patch-detail-data.service';


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
  private flowInterval?: ReturnType<typeof setInterval>;
  private flowState?: FlowAnimationState;
  private readonly revealController: PatchGraphRevealController;

  private readonly flowStartColor = '#FFD447';
  private readonly flowEndColor = '#FFF2A3';
  private readonly flowBaseColor = '#93A0B1';
  private readonly stageBridgeColor = '#9fb4ca';
  private readonly moduleLegendColor = '#8974E4';
  private readonly cvOutColor = '#E2523C';
  private readonly cvInColor = '#4483F2';
  private readonly boundaryStartTint = '#FFE888';
  private readonly boundaryEndTint = '#D6EBFF';
  private readonly moduleJackEdgeColor = 'rgba(137, 116, 228, 0.58)';
  private readonly patchCableBaseColor = '#93A0B1';
  private readonly baseSizeConstant = 5;

  legend = [
    {label: 'Module', color: this.moduleLegendColor},
    {label: 'CV out', color: this.cvOutColor},
    {label: 'CV in', color: this.cvInColor},
    {
      label: 'Start',
      color: interpolateHexColor(this.moduleLegendColor, this.boundaryStartTint, 0.66)
    },
    {
      label: 'End',
      color: interpolateHexColor(this.moduleLegendColor, this.boundaryEndTint, 0.66)
    }
  ];

  constructor(
    public patchDetailDataService: PatchDetailDataService,
    public backend: SupabaseService,
    public graphViewService: GraphViewService
  ) {
    super();
    this.revealController = new PatchGraphRevealController(
      {
        emitNodes: nodes => this.nodes$.next(nodes),
        emitEdges: edges => this.edges$.next(edges),
        startFlow: (visibleEdges, flowEdges) => this.startPersistentFlowAnimation(visibleEdges, flowEdges)
      },
      {stageBridgeColor: this.stageBridgeColor}
    );
  }
  
  // Main orchestration: build triggers, backend hydration, and graph publish happen here.
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
        // Freeze container height during rebuild to avoid visual jump while nodes reset.
        tap(() => {
          const el = this.graphContainer?.nativeElement;
          if (el) {
            el.style.height = el.offsetHeight + 'px';
          }
        }),
        tap(() => this.cancelProgressiveReveal()),
        tap(() => this.nodes$.next([])),
        tap(() => this.edges$.next([])),
        tap(() => this._isStale$.next(false)),
        switchMap(connections => {
          const uniqueModuleIds = [...new Set(
            extractPatchGraphModuleInstances(connections).map(instance => instance.moduleId)
          )];

          return forkJoin(
            uniqueModuleIds.map(moduleId => this.backend.GET.moduleWithId(moduleId).pipe(map(module => module.data)))
          ).pipe(map(modules => ({modules, connections})));
        }),
        delay(500),
        takeUntil(this.destroy$)
      )
      .subscribe(({modules, connections}) => {
        const sizeConstant = computePatchGraphSizeConstant(
          modules.length,
          connections.length,
          this.baseSizeConstant
        );
        
        const graphData = buildPatchGraphData({
          connections,
          modules,
          sizeConstant,
          palette: {
            moduleColor: this.moduleLegendColor,
            cvOutColor: this.cvOutColor,
            cvInColor: this.cvInColor,
            moduleJackEdgeColor: this.moduleJackEdgeColor,
            patchCableBaseColor: this.patchCableBaseColor
          }
        });

        if (this.progressiveRender || this.animateGraphBuild) {
          this.revealGraphProgressively(graphData.nodes, graphData.edges);
        } else {
          this.nodes$.next(graphData.nodes);
          this.edges$.next(graphData.edges);
        }

        this._graphBuiltOnce = true;
        const el = this.graphContainer?.nativeElement;
        if (el) {
          el.style.height = '';
        }
      });
  }

  override ngOnDestroy(): void {
    this.cancelProgressiveReveal();
    super.ngOnDestroy();
  }

  refreshNow(): void {
    this._manualRefresh$.next();
  }
  
  // Progressive reveal sequencing lives in the dedicated controller; component delegates.
  private revealGraphProgressively(nodes: GraphNode[], edges: GraphEdge[]): void {
    this.stopPersistentFlowAnimation();
    this.revealController.reveal(nodes, edges);
  }
  
  private cancelProgressiveReveal(): void {
    this.revealController.cancel();
    this.stopPersistentFlowAnimation();
  }
  
  // Flow animator is stateful so edge heat can decay and pulse across ticks.
  private startPersistentFlowAnimation(edges: GraphEdge[], preferredFlowEdges: GraphEdge[]): void {
    this.stopPersistentFlowAnimation();
    
    const palette = this.flowPalette();
    const flowState = createFlowAnimationState(edges, preferredFlowEdges, palette);
    if (!flowState) {
      return;
    }
    
    this.flowState = flowState;
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
    if (!this.flowState) {
      return;
    }
    
    advanceFlowAnimationState(this.flowState);
    this.emitFlowStyledEdges();
  }
  
  private emitFlowStyledEdges(): void {
    if (!this.flowState) {
      return;
    }
    
    const styledEdges = buildFlowStyledEdges(this.flowState, this.flowPalette());
    this.edges$.next(styledEdges);
  }
  
  private flowPalette(): PatchGraphFlowPalette {
    return {
      flowStartColor: this.flowStartColor,
      flowEndColor: this.flowEndColor,
      flowBaseColor: this.flowBaseColor,
      moduleJackEdgeColor: this.moduleJackEdgeColor
    };
  }
}