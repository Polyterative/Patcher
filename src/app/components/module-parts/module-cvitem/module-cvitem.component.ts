import {
  animate,
  keyframes,
  style,
  transition,
  trigger
} from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output, OnDestroy
} from '@angular/core';
import {
  fadeInOnEnterAnimation,
  fadeOutOnLeaveAnimation
} from 'angular-animations';
import {
  BehaviorSubject,
  combineLatest,
  Subject
} from 'rxjs';
import {
  distinctUntilChanged,
  map,
  takeUntil
} from 'rxjs/operators';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { CV } from 'src/app/models/cv';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';


/** Plays a quick scale-pop whenever the element is created (used on count-keyed inner span). */
const popOnEnter = trigger('popOnEnter', [
  transition(':enter', [
    animate('200ms ease-out', keyframes([
      style({transform: 'scale(0.5)', opacity: 0, offset: 0}),
      style({transform: 'scale(1.3)', opacity: 1, offset: 0.6}),
      style({transform: 'scale(1)', opacity: 1, offset: 1})
    ]))
  ])
]);

@Component({
  selector: 'app-module-cvitem',
  templateUrl: './module-cvitem.component.html',
  styleUrls: ['./module-cvitem.component.scss'],
  animations: [
    fadeInOnEnterAnimation({anchor: 'badgeEnter', duration: 150}),
    fadeOutOnLeaveAnimation({anchor: 'badgeLeave', duration: 100}),
    popOnEnter
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleCVItemComponent implements OnInit, OnDestroy {
  @Input() data: CV;
  @Input() kind: 'in' | 'out';

  /**
   * Instance-aware ID for this CV port.
   * A setter pushes every new value into instanceId$, so reactive pipelines
   * that combine with instanceId$ automatically re-evaluate — fixing the
   * stale-closure bug where ngOnInit captured undefined at first render.
   */
  @Input() set instanceId(value: number | undefined) {
    this._instanceId = value;
    this.instanceId$.next(value);
  }
  get instanceId(): number | undefined { return this._instanceId; }

  @Output() readonly click$ = new EventEmitter<CV>();

  highlightedFrom = new BehaviorSubject(false);
  highlightedTo   = new BehaviorSubject(false);
  /** Number of existing patch connections on this CV port (instance-aware). */
  connectionCount$ = new BehaviorSubject<number>(0);

  /** Reactive mirror of @Input instanceId — updated by the setter on every change. */
  readonly instanceId$ = new BehaviorSubject<number | undefined>(undefined);

  protected destroyEvent$ = new Subject<void>();
  private _instanceId: number | undefined;

  constructor(
    public appState: AppStateService,
    public patchService: PatchDetailDataService
  ) {}

  ngOnInit(): void {

    switch (this.kind) {
      case 'in':
        combineLatest([this.patchService.selectedForConnection$, this.instanceId$])
          .pipe(
            map(([data, instanceId]) =>
              data && data.b
                ? data.b.cv.id === this.data.id && data.b.cv.instance_id === instanceId
                : false
            ),
            takeUntil(this.destroyEvent$)
          )
          .subscribe(this.highlightedFrom);
        break;
      case 'out':
        combineLatest([this.patchService.selectedForConnection$, this.instanceId$])
          .pipe(
            map(([data, instanceId]) =>
              data && data.a
                ? data.a.cv.id === this.data.id && data.a.cv.instance_id === instanceId
                : false
            ),
            takeUntil(this.destroyEvent$)
          )
          .subscribe(this.highlightedTo);
        break;
    }

    // Count existing connections on this specific CV port (instance-aware).
    combineLatest([this.patchService.editorConnections$, this.instanceId$])
      .pipe(
        map(([connections, instanceId]) => {
          if (!connections) return 0;
          return connections.filter(c => {
            if (this.kind === 'out') {
              return c.a.id === this.data.id && c.instance_id_a === instanceId;
            } else {
              return c.b.id === this.data.id && c.instance_id_b === instanceId;
            }
          }).length;
        }),
        distinctUntilChanged(),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(this.connectionCount$);
  }

  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
}
