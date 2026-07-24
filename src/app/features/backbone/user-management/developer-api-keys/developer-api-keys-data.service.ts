import { Injectable, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  ReplaySubject,
  Subject,
  combineLatest,
  from,
  of,
  throwError
} from 'rxjs';
import {
  catchError,
  exhaustMap,
  finalize,
  map,
  shareReplay,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  DeveloperApiKeyCreateResult,
  DeveloperApiKeySlot,
  DeveloperApiKeyUsage
} from 'src/app/features/backend/supabase-api-keys';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';

export const PUBLIC_API_DOCS_URL = 'https://docs.patcher.xyz/reference/public-open-api';
export const DEFAULT_API_KEY_LABEL = 'Public API key';

export interface DeveloperApiTierLimit {
  monthlyQuota: number;
  perMinuteQuota: number;
}

export const DEVELOPER_API_TIER_LIMITS: Record<string, DeveloperApiTierLimit> = {
  free: {
    monthlyQuota: 5_000,
    perMinuteQuota: 60
  },
  partner: {
    monthlyQuota: 500_000,
    perMinuteQuota: 600
  }
};

export interface DeveloperApiKeyReveal {
  id: string;
  prefix: string;
  rawKey: string;
  tier: string;
}

export interface DeveloperApiKeySlotView {
  id: string;
  label: string;
  keyPrefix: string;
  tierCode: string;
  createdAt: string;
  rotatedAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  active: boolean;
  monthlyQuota: number;
  perMinuteQuota: number;
  usedThisMonth: number;
  remainingThisMonth: number;
  usageMonth: string | null;
  usageUpdatedAt: string | null;
}

export interface DeveloperApiKeysViewModel {
  docsUrl: string;
  errorMessage: string | null;
  hasLoaded: boolean;
  isLoading: boolean;
  isSaving: boolean;
  reveal: DeveloperApiKeyReveal | null;
  revokeConfirmId: string | null;
  rotateConfirmationVisible: boolean;
  slot: DeveloperApiKeySlotView | null;
}

export interface ApiKeyErrorLike {
  code?: string;
  message?: string;
}

interface ApiKeyFetchResult {
  slot: DeveloperApiKeySlot | null;
  usage: DeveloperApiKeyUsage | null;
}

type ApiKeyMutationAction = 'create' | 'rotate' | 'revoke';

@Injectable()
export class DeveloperApiKeysDataService extends SubManager implements OnDestroy {
  private readonly _slot$ = new BehaviorSubject<DeveloperApiKeySlot | null>(null);
  private readonly _usage$ = new BehaviorSubject<DeveloperApiKeyUsage | null>(null);
  private readonly _hasLoaded$ = new BehaviorSubject<boolean>(false);
  private readonly _isLoading$ = new BehaviorSubject<boolean>(false);
  private readonly _isSaving$ = new BehaviorSubject<boolean>(false);
  private readonly _errorMessage$ = new BehaviorSubject<string | null>(null);
  private readonly _revealedRawKey$ = new BehaviorSubject<DeveloperApiKeyReveal | null>(null);
  private readonly _rotateConfirmationVisible$ = new BehaviorSubject<boolean>(false);
  private readonly _revokeConfirmId$ = new BehaviorSubject<string | null>(null);

  readonly load$ = new ReplaySubject<void>(1);
  readonly createOrRotate$ = new Subject<void>();
  readonly requestRotateConfirmation$ = new Subject<void>();
  readonly cancelRotateConfirmation$ = new Subject<void>();
  readonly requestRevokeConfirmation$ = new Subject<string>();
  readonly cancelRevokeConfirmation$ = new Subject<void>();
  readonly revoke$ = new Subject<{ id: string }>();
  readonly dismissReveal$ = new Subject<void>();
  readonly copyRevealedKey$ = new Subject<void>();

  readonly vm$: Observable<DeveloperApiKeysViewModel> = combineLatest({
    errorMessage: this._errorMessage$,
    hasLoaded: this._hasLoaded$,
    isLoading: this._isLoading$,
    isSaving: this._isSaving$,
    reveal: this._revealedRawKey$,
    revokeConfirmId: this._revokeConfirmId$,
    rotateConfirmationVisible: this._rotateConfirmationVisible$,
    slot: this._slot$,
    usage: this._usage$
  }).pipe(
    map(state => ({
      docsUrl: PUBLIC_API_DOCS_URL,
      errorMessage: state.errorMessage,
      hasLoaded: state.hasLoaded,
      isLoading: state.isLoading,
      isSaving: state.isSaving,
      reveal: state.reveal,
      revokeConfirmId: state.revokeConfirmId,
      rotateConfirmationVisible: state.rotateConfirmationVisible,
      slot: state.slot ? this.toSlotView(state.slot, state.usage) : null
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor(
    private readonly backend: SupabaseService,
    private readonly snackBar: MatSnackBar
  ) {
    super();
    this.initializeLoadHandler();
    this.initializeCreateOrRotateHandler();
    this.initializeRevokeHandler();
    this.initializeConfirmationHandlers();
    this.initializeRevealHandlers();
  }

  override ngOnDestroy(): void {
    this.discardRevealedRawKey();
    super.ngOnDestroy();
  }

  private initializeLoadHandler(): void {
    this.load$.pipe(
      switchMap(() => {
        this._isLoading$.next(true);
        this._errorMessage$.next(null);

        return this.fetchSlotWithUsage$().pipe(
          tap(result => this.publishFetchResult(result)),
          catchError((error: ApiKeyErrorLike) => this.handleLoadError$(error)),
          finalize(() => this._isLoading$.next(false))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private initializeCreateOrRotateHandler(): void {
    this.createOrRotate$.pipe(
      withLatestFrom(
        this._slot$,
        this._hasLoaded$,
        this._isLoading$,
        this._isSaving$,
        this._rotateConfirmationVisible$
      ),
      exhaustMap(([, currentSlot, hasLoaded, isLoading, isSaving, rotateConfirmationVisible]) => {
        if (!hasLoaded || isLoading || isSaving) {
          this.reportInlineError('Public API credential status must load before creating or rotating a key. Use Retry if loading failed.');
          return EMPTY;
        }

        const wasActiveRotation = currentSlot?.revokedAt === null;
        if (wasActiveRotation && !rotateConfirmationVisible) {
          this._rotateConfirmationVisible$.next(true);
          this._revokeConfirmId$.next(null);
          return EMPTY;
        }

        const mutationAction: ApiKeyMutationAction = wasActiveRotation ? 'rotate' : 'create';
        this.discardRevealedRawKey();
        this._isSaving$.next(true);
        this._errorMessage$.next(null);
        this._rotateConfirmationVisible$.next(false);
        this._revokeConfirmId$.next(null);

        return this.backend.apiKeys.createOrRotateOwnKey(DEFAULT_API_KEY_LABEL).pipe(
          tap(reveal => this.publishReveal(reveal)),
          switchMap(() => this.fetchSlotWithUsage$().pipe(
            tap(result => {
              this.publishFetchResult(result);
              SharedConstants.successCustom(
                this.snackBar,
                wasActiveRotation
                  ? 'API key rotated. Copy the new key now.'
                  : 'API key created. Copy it now.'
              );
            }),
            catchError((error: ApiKeyErrorLike) => this.handlePostSuccessRefreshError$(error, mutationAction))
          )),
          catchError((error: ApiKeyErrorLike) => this.handleMutationError$(error, mutationAction)),
          finalize(() => this._isSaving$.next(false))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private initializeRevokeHandler(): void {
    this.revoke$.pipe(
      exhaustMap(({ id }) => {
        this.discardRevealedRawKey();
        this._isSaving$.next(true);
        this._errorMessage$.next(null);

        return this.backend.apiKeys.revokeOwnKey(id).pipe(
          tap(() => {
            this.markSlotRevoked(id);
            this._revokeConfirmId$.next(null);
            this._rotateConfirmationVisible$.next(false);
          }),
          switchMap(() => this.fetchSlotWithUsage$().pipe(
            tap(result => {
              this.publishFetchResult(result);
              SharedConstants.successCustom(this.snackBar, 'API key revoked.');
            }),
            catchError((error: ApiKeyErrorLike) => this.handlePostSuccessRefreshError$(error, 'revoke'))
          )),
          catchError((error: ApiKeyErrorLike) => this.handleMutationError$(error, 'revoke')),
          finalize(() => this._isSaving$.next(false))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private initializeConfirmationHandlers(): void {
    this.requestRotateConfirmation$.pipe(
      tap(() => {
        this._rotateConfirmationVisible$.next(true);
        this._revokeConfirmId$.next(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe();

    this.cancelRotateConfirmation$.pipe(
      tap(() => this._rotateConfirmationVisible$.next(false)),
      takeUntil(this.destroy$)
    ).subscribe();

    this.requestRevokeConfirmation$.pipe(
      tap(id => {
        this._revokeConfirmId$.next(id);
        this._rotateConfirmationVisible$.next(false);
      }),
      takeUntil(this.destroy$)
    ).subscribe();

    this.cancelRevokeConfirmation$.pipe(
      tap(() => this._revokeConfirmId$.next(null)),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private initializeRevealHandlers(): void {
    this.dismissReveal$.pipe(
      tap(() => this.discardRevealedRawKey()),
      takeUntil(this.destroy$)
    ).subscribe();

    this.copyRevealedKey$.pipe(
      withLatestFrom(this._revealedRawKey$),
      exhaustMap(([, reveal]) => {
        if (!reveal) {
          this.reportInlineError('There is no API key visible to copy.');
          return EMPTY;
        }

        return this.copyToClipboard$(reveal.rawKey).pipe(
          tap(() => SharedConstants.successCustom(this.snackBar, 'API key copied.')),
          catchError((error: ApiKeyErrorLike) => this.handleClipboardError$(error))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private fetchSlotWithUsage$(): Observable<ApiKeyFetchResult> {
    return this.backend.apiKeys.getOwnKeySlot().pipe(
      switchMap(slot => slot
        ? this.backend.apiKeys.getOwnUsage(slot.id).pipe(
          map(usage => ({ slot, usage }))
        )
        : of({ slot: null, usage: null })
      )
    );
  }

  private publishFetchResult(result: ApiKeyFetchResult): void {
    this._hasLoaded$.next(true);
    this._slot$.next(result.slot);
    this._usage$.next(result.usage);
    this._errorMessage$.next(null);
  }

  private markSlotRevoked(id: string): void {
    const currentSlot = this._slot$.value;
    if (currentSlot?.id !== id) {
      return;
    }

    this._slot$.next({
      ...currentSlot,
      revokedAt: currentSlot.revokedAt ?? new Date().toISOString()
    });
  }

  private publishReveal(result: DeveloperApiKeyCreateResult): void {
    this._revealedRawKey$.next({
      id: result.id,
      prefix: result.prefix,
      rawKey: result.rawKey,
      tier: result.tier
    });
  }

  private discardRevealedRawKey(): void {
    this._revealedRawKey$.next(null);
  }

  private toSlotView(
    slot: DeveloperApiKeySlot,
    usage: DeveloperApiKeyUsage | null
  ): DeveloperApiKeySlotView {
    const tierLimits = DEVELOPER_API_TIER_LIMITS[slot.tierCode] ?? DEVELOPER_API_TIER_LIMITS.free;
    const monthlyQuota = slot.monthlyQuotaOverride ?? tierLimits.monthlyQuota;
    const perMinuteQuota = slot.perMinuteQuotaOverride ?? tierLimits.perMinuteQuota;
    const usedThisMonth = usage?.used ?? 0;

    return {
      active: slot.revokedAt === null,
      createdAt: slot.createdAt,
      id: slot.id,
      keyPrefix: slot.keyPrefix,
      label: slot.label ?? 'Public API key',
      lastUsedAt: slot.lastUsedAt,
      monthlyQuota,
      perMinuteQuota,
      remainingThisMonth: Math.max(monthlyQuota - usedThisMonth, 0),
      revokedAt: slot.revokedAt,
      rotatedAt: slot.rotatedAt,
      tierCode: slot.tierCode,
      usageMonth: usage?.month ?? null,
      usageUpdatedAt: usage?.updatedAt ?? null,
      usedThisMonth
    };
  }

  private copyToClipboard$(text: string): Observable<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return throwError(() => new Error('Clipboard API is unavailable.'));
    }

    return from(navigator.clipboard.writeText(text));
  }

  private handleLoadError$(error: ApiKeyErrorLike): Observable<never> {
    const message = this.messageForError(error, 'Public API credentials could not be loaded. Existing data is still shown.');
    console.error('Public API key load failed:', error);
    this._errorMessage$.next(message);
    SharedConstants.errorCustom(this.snackBar, message);
    return EMPTY;
  }

  private handleMutationError$(error: ApiKeyErrorLike, action: ApiKeyMutationAction): Observable<never> {
    const fallback = action === 'revoke'
      ? 'API key could not be revoked. Try again.'
      : `API key could not be ${ action === 'rotate' ? 'rotated' : 'created' }. Try again.`;
    const message = this.messageForError(error, fallback);
    console.error(`Public API key ${ action } failed:`, error);
    this._errorMessage$.next(message);
    SharedConstants.errorCustom(this.snackBar, message);
    return EMPTY;
  }

  private handlePostSuccessRefreshError$(error: ApiKeyErrorLike, action: ApiKeyMutationAction): Observable<never> {
    const message = this.partialRefreshMessage(action);
    console.error(`Public API key ${ action } refresh failed after success:`, error);
    this._errorMessage$.next(message);
    SharedConstants.errorCustom(this.snackBar, message);
    return EMPTY;
  }

  private handleClipboardError$(error: ApiKeyErrorLike): Observable<never> {
    const message = this.messageForError(error, 'Clipboard write failed — copy the key manually.');
    console.error('Public API key clipboard copy failed:', error);
    this._errorMessage$.next(message);
    SharedConstants.errorCustom(this.snackBar, message);
    return EMPTY;
  }

  private reportInlineError(message: string): void {
    this._errorMessage$.next(message);
    SharedConstants.errorCustom(this.snackBar, message);
  }

  private messageForError(error: ApiKeyErrorLike, fallback: string): string {
    if (error.code === '28000') {
      return 'Sign in again to manage Public API credentials.';
    }
    if (error.code === '42501') {
      return 'This account is not allowed to manage Public API credentials.';
    }
    return error.message || fallback;
  }

  private partialRefreshMessage(action: ApiKeyMutationAction): string {
    if (action === 'revoke') {
      return 'API key was revoked, but account details could not refresh. Retry to verify the latest state.';
    }

    const verb = action === 'rotate' ? 'rotated' : 'created';
    return `API key was ${ verb } and must be copied now, but account details could not refresh. Retry will keep this key visible.`;
  }
}
