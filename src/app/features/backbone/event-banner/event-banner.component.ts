import {
  isPlatformBrowser
}                        from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  PLATFORM_ID
}                        from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  of
}                        from 'rxjs';
import { map }           from 'rxjs/operators';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SubManager }    from 'src/app/shared-interproject/directives/subscription-manager';
import {
  EVENT_BANNER_CONFIG,
  EventBannerConfig
}                        from './event-banner.config';


@Component({
  selector:        'app-event-banner',
  templateUrl:     './event-banner.component.html',
  styleUrls:       ['./event-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone:      false,
})
export class EventBannerComponent extends SubManager {

  private static readonly DISMISSED_STORAGE_KEY_PREFIX = 'event-banner-dismissed:';

  readonly config: EventBannerConfig | null;

  private readonly dismissed$: BehaviorSubject<boolean>;

  readonly isVisible$: Observable<boolean>;

  readonly expanded$ = new BehaviorSubject<boolean>(false);

  readonly isMarqueeVisible$: Observable<boolean>;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    @Inject(EVENT_BANNER_CONFIG) config: EventBannerConfig | null,
    private readonly userService: UserManagementService,
  ) {
    super();
    this.config     = config;
    this.dismissed$ = new BehaviorSubject<boolean>(this.readDismissedState());
    // Only depend on auth state when the banner is auth-gated.
    const isLoggedIn$ = config?.authOnly
      ? this.userService.loggedUser$.pipe(map(user => !!user))
      : of(true);
    this.isVisible$ = combineLatest([
      of(this.computeDateVisible()),
      this.dismissed$,
      isLoggedIn$,
    ]).pipe(
      map(([dateVisible, dismissed, loggedIn]) =>
        dateVisible && !dismissed && loggedIn),
    );
    this.isMarqueeVisible$ = combineLatest([
      of(this.computeMarqueeVisible()),
      this.dismissed$,
    ]).pipe(
      map(([marqueeVisible, dismissed]) => marqueeVisible && !dismissed),
    );
  }

  toggleExpanded(): void {
    this.expanded$.next(!this.expanded$.value);
  }

  dismiss(): void {
    this.persistDismissedState(true);
    this.dismissed$.next(true);
  }

  private computeDateVisible(): boolean {
    if (!this.config) {
      return false;
    }
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    const now   = Date.now();
    const start = new Date(`${this.config.startDate}T00:00:00`).getTime();
    const end   = new Date(`${this.config.endDate}T23:59:59`).getTime();
    return now >= start && now <= end;
  }

  private computeMarqueeVisible(): boolean {
    if (!this.config?.marquee) {
      return false;
    }
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    const now   = Date.now();
    const start = new Date(`${this.config.marquee.startDate ?? this.config.startDate}T00:00:00`).getTime();
    const end   = new Date(`${this.config.marquee.endDate ?? this.config.endDate}T23:59:59`).getTime();
    return now >= start && now <= end;
  }

  private readDismissedState(): boolean {
    const storageKey = this.getDismissedStorageKey();
    if (!storageKey || !isPlatformBrowser(this.platformId)) {
      return false;
    }
    try {
      return window.localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  }

  private persistDismissedState(dismissed: boolean): void {
    const storageKey = this.getDismissedStorageKey();
    if (!storageKey || !isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      window.localStorage.setItem(storageKey, String(dismissed));
    } catch {
      // Continue with in-memory dismissal when storage is unavailable.
    }
  }

  private getDismissedStorageKey(): string | null {
    if (!this.config?.id) {
      return null;
    }
    return `${EventBannerComponent.DISMISSED_STORAGE_KEY_PREFIX}${this.config.id}`;
  }
}
