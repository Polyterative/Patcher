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
  DiscoveryTipUserAreaSnapshot
} from './discovery-tip.models';
import {
  DEFAULT_GLOBAL_DISCOVERY_TIP_PAUSE_MS,
  DISCOVERY_TIP_GLOBAL_PAUSE_ID,
  DISCOVERY_TIP_STORAGE_KEY
} from './discovery-tip.constants';
import {
  buildDiscoveryTipActive,
  canShowTipOnCurrentRoute,
  guidedDiscoveryTips,
  isSnoozed,
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
  private readonly _tipStates$ = new BehaviorSubject<Record<string, DiscoveryTipStateRecord>>({});
  private readonly _sessionActions$ = new BehaviorSubject<Record<string, number>>({});
  private readonly _userAreaSnapshot$ = new BehaviorSubject<DiscoveryTipUserAreaSnapshot>(defaultDiscoveryTipUserAreaSnapshot);

  private queuedTipId: string | null = null;
  private queueTimer: ReturnType<typeof setTimeout> | undefined;
  private guidedTourActive = false;
  private guidedTourIndex = 0;

  readonly activeTip$ = this._activeTip$.asObservable();

  constructor(
    private readonly router: Router,
    private readonly userManagementService: UserManagementService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    super();
    this.isBrowser = isPlatformBrowser(platformId);

    this._route$.next(this.router.url ?? '');
    this._tipStates$.next(this.readViewerTipStates('guest'));

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
        this._tipStates$.next(this.readViewerTipStates(viewerKey));
        this._sessionActions$.next({});
        this.guidedTourActive = false;
        this.guidedTourIndex = 0;
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
      this._activeTip$.next(null);
      this._route$.next(event.urlAfterRedirects);
    });

    combineLatest([
      this._route$,
      this._viewerKey$,
      this._isLoggedIn$,
      this._anchorsRevision$,
      this._tipStates$,
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

    const matchingTips = discoveryTipRegistry.filter((tip) => tip.completionActions?.includes(actionKey));
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
    const nextStates = {
      ...this._tipStates$.value,
      [DISCOVERY_TIP_GLOBAL_PAUSE_ID]: {
        version: 1,
        shownCount: 0,
        snoozedUntil: pausedUntil
      }
    };

    this._tipStates$.next(nextStates);
    this.persistViewerTipStates(this._viewerKey$.value, nextStates);
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

  private refreshActiveTip(): void {
    if (!this.isBrowser) {
      this.clearQueuedTip();
      this._activeTip$.next(null);
      return;
    }

    const snapshot = this.buildSnapshot();
    if (this.guidedTourActive) {
      this.clearQueuedTip();
      const currentTip = this._activeTip$.value;
      if (
        currentTip?.guidedStepTotal
        && this.shouldKeepGuidedTip(currentTip.definition, snapshot)
      ) {
        return;
      }
      this.showGuidedTipFromIndex(this.guidedTourIndex, snapshot);
      return;
    }

    const currentTip = this._activeTip$.value;
    if (currentTip) {
      if (this.shouldKeepActiveTip(currentTip.definition, snapshot)) {
        return;
      }
      this._activeTip$.next(null);
    }

    const candidate = this.findCandidate();

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

      this._activeTip$.next({
        ...buildDiscoveryTipActive(latestCandidate, anchorElement, this.buildSnapshot())
      });

      this.updateTipState(latestCandidate, (currentState) => ({
        ...currentState,
        shownCount: currentState.shownCount + 1,
        lastShownAt: new Date().toISOString(),
        snoozedUntil: undefined
      }));
    }, delay);
  }

  private shouldKeepActiveTip(
    definition: DiscoveryTipDefinition,
    snapshot: DiscoveryTipContextSnapshot
  ): boolean {
    if (!canShowTipOnCurrentRoute(definition, snapshot)) {
      return false;
    }

    const anchorElement = this.anchors.get(definition.anchorId);
    if (!anchorElement) {
      return false;
    }

    const currentState = this.getTipState(definition);
    if (currentState.learnedAt) {
      return false;
    }

    if (isSnoozed(currentState.snoozedUntil)) {
      return false;
    }

    return definition.isEligible(snapshot);
  }

  private shouldKeepGuidedTip(
    definition: DiscoveryTipDefinition,
    snapshot: DiscoveryTipContextSnapshot
  ): boolean {
    return canShowTipOnCurrentRoute(definition, snapshot) && this.anchors.has(definition.anchorId);
  }

  private findCandidate(): DiscoveryTipDefinition | null {
    const snapshot = this.buildSnapshot();
    const sortedTips = [...discoveryTipRegistry].sort((left, right) => left.priority - right.priority);
    return sortedTips.find((tip) => this.isTipEligible(tip, snapshot)) ?? null;
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
    const guidedTips = this.guidedTips();
    for (let index = startIndex; index < guidedTips.length; index += 1) {
      const definition = guidedTips[index];
      if (!this.shouldKeepGuidedTip(definition, snapshot)) {
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
        snapshot,
        index + 1,
        guidedTips.length
      ));
      return;
    }

    this.guidedTourActive = false;
    this.guidedTourIndex = 0;
    this._activeTip$.next(null);
  }

  private guidedTips(): DiscoveryTipDefinition[] {
    return guidedDiscoveryTips(discoveryTipRegistry);
  }

  private isTipEligible(definition: DiscoveryTipDefinition, snapshot: DiscoveryTipContextSnapshot): boolean {
    const globalPauseState = this._tipStates$.value[DISCOVERY_TIP_GLOBAL_PAUSE_ID];
    if (isSnoozed(globalPauseState?.snoozedUntil)) {
      return false;
    }

    if (!canShowTipOnCurrentRoute(definition, snapshot)) {
      return false;
    }

    if (!this.anchors.has(definition.anchorId)) {
      return false;
    }

    const currentState = this.getTipState(definition);
    if (currentState.learnedAt) {
      return false;
    }

    if (isSnoozed(currentState.snoozedUntil)) {
      return false;
    }

    const maxShowCount = definition.maxShowCount ?? 1;
    if (currentState.shownCount >= maxShowCount) {
      return false;
    }

    return definition.isEligible(snapshot);
  }

  private markTipLearned(tipId: string): void {
    const definition = discoveryTipRegistry.find((tip) => tip.id === tipId);
    if (!definition) {
      return;
    }

    this.updateTipState(definition, (currentState) => ({
      ...currentState,
      learnedAt: new Date().toISOString(),
      snoozedUntil: undefined
    }));

    if (this._activeTip$.value?.definition.id === tipId) {
      this._activeTip$.next(null);
    }
  }

  private getTipState(definition: DiscoveryTipDefinition): DiscoveryTipStateRecord {
    return normalizeTipState(definition, this._tipStates$.value[definition.id]);
  }

  private updateTipState(
    definition: DiscoveryTipDefinition,
    updater: (currentState: DiscoveryTipStateRecord) => DiscoveryTipStateRecord
  ): void {
    const nextStates = {
      ...this._tipStates$.value,
      [definition.id]: updater(this.getTipState(definition))
    };

    this._tipStates$.next(nextStates);
    this.persistViewerTipStates(this._viewerKey$.value, nextStates);
  }

  private readViewerTipStates(viewerKey: string): Record<string, DiscoveryTipStateRecord> {
    const storage = readDiscoveryTipStorage(this.isBrowser);
    return storage.viewers[viewerKey] ?? {};
  }

  private persistViewerTipStates(
    viewerKey: string,
    tipStates: Record<string, DiscoveryTipStateRecord>
  ): void {
    if (!this.isBrowser) {
      return;
    }

    const storage = readDiscoveryTipStorage(this.isBrowser);
    storage.viewers[viewerKey] = tipStates;
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
