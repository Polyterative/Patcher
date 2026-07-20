import { isPlatformBrowser } from '@angular/common';
import {
  Inject,
  Injectable,
  PLATFORM_ID
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  BehaviorSubject,
  combineLatest
} from 'rxjs';
import {
  filter,
  startWith
} from 'rxjs/operators';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SubManager } from '../directives/subscription-manager';
import { discoveryTipRegistry } from './discovery-tip.registry';
import {
  defaultDiscoveryTipUserAreaSnapshot,
  DiscoveryTipActive,
  DiscoveryTipContextSnapshot,
  DiscoveryTipDefinition,
  DiscoveryTipStateRecord,
  DiscoveryTipViewerState,
  DiscoveryTipUserAreaSnapshot
} from './discovery-tip.models';
import {
  DEFAULT_GLOBAL_DISCOVERY_TIP_PAUSE_MS,
  DISCOVERY_TIP_GLOBAL_PAUSE_ID,
  DISCOVERY_TIP_STORAGE_KEY
} from './discovery-tip.constants';
import {
  DiscoveryTipSelectionContext,
  discoveryTipsMatchingAction,
  findAutomaticDiscoveryTipCandidate,
  shouldKeepAutomaticDiscoveryTip,
  shouldKeepGuidedDiscoveryTip
} from './discovery-tip-selection.utils';
import {
  buildDiscoveryTipActive,
  ensureDiscoveryTipViewerState,
  guidedDiscoveryTips,
  initializeDiscoveryTipViewerState,
  normalizeTipState,
  readDiscoveryTipStorage,
  writeDiscoveryTipStorage
} from './discovery-tip.utils';

export { DISCOVERY_TIP_STORAGE_KEY } from './discovery-tip.constants';

@Injectable({
  providedIn: 'root'
})
export class DiscoveryTipService extends SubManager {
  private readonly isBrowser: boolean;
  private readonly anchors = new Map<string, HTMLElement>();
  private readonly _activeTip$ = new BehaviorSubject<DiscoveryTipActive | null>(null);
  private readonly _route$ = new BehaviorSubject<string>('');
  private readonly _viewerKey$ = new BehaviorSubject<string>('guest');
  private readonly _isLoggedIn$ = new BehaviorSubject<boolean>(false);
  private readonly _anchorsRevision$ = new BehaviorSubject<number>(0);
  private readonly _viewerState$ = new BehaviorSubject<DiscoveryTipViewerState>(
    initializeDiscoveryTipViewerState(discoveryTipRegistry)
  );
  private readonly _sessionActions$ = new BehaviorSubject<Record<string, number>>({});
  private readonly _userAreaSnapshot$ = new BehaviorSubject<DiscoveryTipUserAreaSnapshot>(defaultDiscoveryTipUserAreaSnapshot);

  private queuedTipId: string | null = null;
  private queueTimer: ReturnType<typeof setTimeout> | undefined;
  private guidedTourActive = false;
  private guidedTourIndex = 0;
  private automaticTipShownThisVisit = false;

  readonly activeTip$ = this._activeTip$.asObservable();

  constructor(
    private readonly router: Router,
    private readonly userManagementService: UserManagementService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    super();
    this.isBrowser = isPlatformBrowser(platformId);

    this._route$.next(this.router.url ?? '');
    this._viewerState$.next(this.readViewerState('guest'));

    combineLatest([
      this.userManagementService.loggedUser$.pipe(startWith(undefined)),
      this.userManagementService.loggedUserFullProfile$.pipe(startWith(undefined))
    ]).pipe(
      this.takeUntilDestroyed()
    ).subscribe(([user, profile]) => {
      const viewerKey = profile?.id ?? user?.id ?? 'guest';
      this._isLoggedIn$.next(!!user);
      if (this._viewerKey$.value !== viewerKey) {
        this._viewerKey$.next(viewerKey);
        this._viewerState$.next(this.readViewerState(viewerKey));
        this._sessionActions$.next({});
        this.guidedTourActive = false;
        this.guidedTourIndex = 0;
        this.automaticTipShownThisVisit = false;
        this._activeTip$.next(null);
      }
    });

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      this.takeUntilDestroyed()
    ).subscribe((event) => {
      this.clearQueuedTip();
      this.guidedTourActive = false;
      this.guidedTourIndex = 0;
      this.automaticTipShownThisVisit = false;
      this._activeTip$.next(null);
      this._route$.next(event.urlAfterRedirects);
    });

    combineLatest([
      this._route$,
      this._viewerKey$,
      this._isLoggedIn$,
      this._anchorsRevision$,
      this._viewerState$,
      this._sessionActions$,
      this._userAreaSnapshot$,
    ]).pipe(
      this.takeUntilDestroyed()
    ).subscribe(() => {
      this.refreshActiveTip();
    });
  }

  registerAnchor(anchorId: string, element: HTMLElement): void {
    this.anchors.set(anchorId, element);
    this._anchorsRevision$.next(this._anchorsRevision$.value + 1);
  }

  unregisterAnchor(anchorId: string, element: HTMLElement): void {
    const currentElement = this.anchors.get(anchorId);
    if (currentElement !== element) {
      return;
    }
    this.anchors.delete(anchorId);
    if (this._activeTip$.value?.definition.anchorId === anchorId) {
      this._activeTip$.next(null);
    }
    this._anchorsRevision$.next(this._anchorsRevision$.value + 1);
  }

  updateUserAreaSnapshot(snapshot: Partial<DiscoveryTipUserAreaSnapshot>): void {
    this._userAreaSnapshot$.next({
      ...this._userAreaSnapshot$.value,
      ...snapshot
    });
  }

  recordAction(actionKey: string): void {
    this._sessionActions$.next({
      ...this._sessionActions$.value,
      [actionKey]: Date.now()
    });

    const matchingTips = discoveryTipsMatchingAction(discoveryTipRegistry, actionKey);
    matchingTips.forEach((tip) => this.markTipLearned(tip.id));
  }

  acknowledgeActiveTip(): void {
    const activeTip = this._activeTip$.value;
    if (!activeTip) {
      return;
    }
    if (activeTip.guidedStepTotal) {
      this.advanceGuidedTour();
      return;
    }
    this.markTipLearned(activeTip.definition.id);
  }

  snoozeActiveTip(): void {
    const activeTip = this._activeTip$.value;
    if (!activeTip) {
      return;
    }
    if (activeTip.guidedStepTotal) {
      this.endGuidedTour();
      return;
    }

    const snoozeDuration = activeTip.definition.snoozeDurationMs ?? 1000 * 60 * 60 * 24 * 2;
    this.updateTipState(activeTip.definition, (currentState) => ({
      ...currentState,
      snoozedUntil: new Date(Date.now() + snoozeDuration).toISOString()
    }));
    this._activeTip$.next(null);
  }

  startUserAreaTour(): void {
    if (!this.isBrowser) {
      return;
    }

    this.clearQueuedTip();
    this.guidedTourActive = true;
    this.guidedTourIndex = 0;
    this._activeTip$.next(null);
    this.showGuidedTipFromIndex(0);
  }

  endGuidedTour(): void {
    this.guidedTourActive = false;
    this.guidedTourIndex = 0;
    this.clearQueuedTip();
    this._activeTip$.next(null);
    this.refreshActiveTip();
  }

  pauseAllTips(durationMs = DEFAULT_GLOBAL_DISCOVERY_TIP_PAUSE_MS): void {
    const pausedUntil = new Date(Date.now() + durationMs).toISOString();
    const viewerState = this._viewerState$.value;
    const nextStates = {
      ...viewerState.tips,
      [DISCOVERY_TIP_GLOBAL_PAUSE_ID]: {
        version: 1,
        shownCount: 0,
        snoozedUntil: pausedUntil
      }
    };

    this.updateViewerState({
      ...viewerState,
      tips: nextStates
    });
    this.clearQueuedTip();
    this._activeTip$.next(null);
  }

  private buildSnapshot(): DiscoveryTipContextSnapshot {
    return {
      currentRoute: this._route$.value,
      isLoggedIn: this._isLoggedIn$.value,
      viewerKey: this._viewerKey$.value,
      sessionActions: this._sessionActions$.value,
      userArea: this._userAreaSnapshot$.value
    };
  }

  private buildSelectionContext(snapshot = this.buildSnapshot()): DiscoveryTipSelectionContext {
    return {
      definitions: discoveryTipRegistry,
      snapshot,
      anchorIds: new Set(this.anchors.keys()),
      viewerState: this._viewerState$.value,
      nowMs: Date.now()
    };
  }

  private refreshActiveTip(): void {
    if (!this.isBrowser) {
      this.clearQueuedTip();
      this._activeTip$.next(null);
      return;
    }

    const snapshot = this.buildSnapshot();
    const selectionContext = this.buildSelectionContext(snapshot);
    if (this.guidedTourActive) {
      this.clearQueuedTip();
      const currentTip = this._activeTip$.value;
      if (
        currentTip?.guidedStepTotal
        && shouldKeepGuidedDiscoveryTip(currentTip.definition, selectionContext)
      ) {
        return;
      }
      this.showGuidedTipFromIndex(this.guidedTourIndex, snapshot);
      return;
    }

    const currentTip = this._activeTip$.value;
    if (currentTip) {
      if (shouldKeepAutomaticDiscoveryTip(currentTip.definition, selectionContext)) {
        return;
      }
      this._activeTip$.next(null);
    }

    if (this.automaticTipShownThisVisit) {
      this.clearQueuedTip();
      this._activeTip$.next(null);
      return;
    }

    const candidate = this.findCandidate(snapshot);

    if (!candidate) {
      this.clearQueuedTip();
      this._activeTip$.next(null);
      return;
    }

    if (currentTip?.definition.id === candidate.id) {
      return;
    }

    if (this.queuedTipId === candidate.id) {
      return;
    }

    this.clearQueuedTip();
    this.queuedTipId = candidate.id;
    const delay = candidate.displayDelayMs ?? 900;
    this.queueTimer = setTimeout(() => {
      this.queuedTipId = null;
      const latestCandidate = this.findCandidate();
      if (!latestCandidate || latestCandidate.id !== candidate.id) {
        return;
      }

      const anchorElement = this.anchors.get(latestCandidate.anchorId);
      if (!anchorElement) {
        return;
      }

      this._activeTip$.next(buildDiscoveryTipActive(latestCandidate, anchorElement));
      this.recordAutomaticTipActivated(latestCandidate);
    }, delay);
  }

  private findCandidate(snapshot = this.buildSnapshot()): DiscoveryTipDefinition | null {
    return findAutomaticDiscoveryTipCandidate(this.buildSelectionContext(snapshot));
  }

  private advanceGuidedTour(): void {
    const activeTip = this._activeTip$.value;
    if (!activeTip?.guidedStepTotal || activeTip.guidedStepIndex === undefined) {
      return;
    }

    const nextIndex = activeTip.guidedStepIndex;
    const isLastStep = nextIndex >= activeTip.guidedStepTotal;
    this.guidedTourIndex = nextIndex;
    this._activeTip$.next(null);
    this.updateTipState(activeTip.definition, (currentState) => ({
      ...currentState,
      learnedAt: new Date().toISOString(),
      snoozedUntil: undefined
    }));

    if (isLastStep) {
      this.guidedTourActive = false;
      this.guidedTourIndex = 0;
      this.refreshActiveTip();
    }
  }

  private showGuidedTipFromIndex(
    startIndex: number,
    snapshot = this.buildSnapshot()
  ): void {
    const selectionContext = this.buildSelectionContext(snapshot);
    const guidedTips = guidedDiscoveryTips(discoveryTipRegistry);
    for (let index = startIndex; index < guidedTips.length; index += 1) {
      const definition = guidedTips[index];
      if (!shouldKeepGuidedDiscoveryTip(definition, selectionContext)) {
        continue;
      }

      const anchorElement = this.anchors.get(definition.anchorId);
      if (!anchorElement) {
        continue;
      }

      this.guidedTourIndex = index;
      this._activeTip$.next(buildDiscoveryTipActive(
        definition,
        anchorElement,
        index + 1,
        guidedTips.length
      ));
      return;
    }

    this.guidedTourActive = false;
    this.guidedTourIndex = 0;
    this._activeTip$.next(null);
  }

  private markTipLearned(tipId: string): void {
    const definition = discoveryTipRegistry.find((tip) => tip.id === tipId);
    if (!definition) {
      return;
    }

    if (this._activeTip$.value?.definition.id === tipId) {
      this._activeTip$.next(null);
    }

    this.updateTipState(definition, (currentState) => ({
      ...currentState,
      learnedAt: new Date().toISOString(),
      snoozedUntil: undefined
    }));
  }

  private getTipState(definition: DiscoveryTipDefinition): DiscoveryTipStateRecord {
    return normalizeTipState(definition, this._viewerState$.value.tips[definition.id]);
  }

  private updateTipState(
    definition: DiscoveryTipDefinition,
    updater: (currentState: DiscoveryTipStateRecord) => DiscoveryTipStateRecord
  ): void {
    const viewerState = this._viewerState$.value;
    const nextStates = {
      ...viewerState.tips,
      [definition.id]: updater(this.getTipState(definition))
    };

    this.updateViewerState({
      ...viewerState,
      tips: nextStates
    });
  }

  private recordAutomaticTipActivated(definition: DiscoveryTipDefinition): void {
    const shownAt = new Date().toISOString();
    const viewerState = this._viewerState$.value;
    const nextStates = {
      ...viewerState.tips,
      [definition.id]: {
        ...this.getTipState(definition),
        shownCount: this.getTipState(definition).shownCount + 1,
        lastShownAt: shownAt,
        snoozedUntil: undefined
      }
    };

    this.automaticTipShownThisVisit = true;
    this.updateViewerState({
      ...viewerState,
      lastTipShownAt: shownAt,
      lastShownTipId: definition.id,
      tips: nextStates
    });
  }

  private updateViewerState(viewerState: DiscoveryTipViewerState): void {
    this._viewerState$.next(viewerState);
    this.persistViewerState(this._viewerKey$.value, viewerState);
  }

  private readViewerState(viewerKey: string): DiscoveryTipViewerState {
    const shouldPersistMigratedStorage = this.isBrowser
      && !window.localStorage.getItem(DISCOVERY_TIP_STORAGE_KEY);
    const storage = readDiscoveryTipStorage(this.isBrowser);
    const result = ensureDiscoveryTipViewerState(storage, viewerKey, discoveryTipRegistry);
    if (result.changed || shouldPersistMigratedStorage) {
      writeDiscoveryTipStorage(this.isBrowser, result.storage);
    }
    return result.viewerState;
  }

  private persistViewerState(
    viewerKey: string,
    viewerState: DiscoveryTipViewerState
  ): void {
    if (!this.isBrowser) {
      return;
    }

    const storage = readDiscoveryTipStorage(this.isBrowser);
    storage.viewers[viewerKey] = viewerState;
    writeDiscoveryTipStorage(this.isBrowser, storage);
  }

  private clearQueuedTip(): void {
    if (this.queueTimer !== undefined) {
      clearTimeout(this.queueTimer);
      this.queueTimer = undefined;
    }
    this.queuedTipId = null;
  }

  override ngOnDestroy(): void {
    this.clearQueuedTip();
    super.ngOnDestroy();
  }
}
