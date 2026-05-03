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

  readonly isMarqueeVisible$: Observable<boolean>;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    @Inject(EVENT_BANNER_CONFIG) config: EventBannerConfig | null,
  ) {
    super();
    this.config     = config;
    this.dismissed$ = new BehaviorSubject<boolean>(this.readDismissedState());
    this.isVisible$ = combineLatest([
      of(this.computeDateVisible()),
      this.dismissed$,
    ]).pipe(
      map(([dateVisible, dismissed]) => dateVisible && !dismissed),
    );
    this.isMarqueeVisible$ = combineLatest([
      of(this.computeMarqueeVisible()),
      this.dismissed$,
    ]).pipe(
      map(([marqueeVisible, dismissed]) => marqueeVisible && !dismissed),
    );
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
    const start = new Date(this.config.startDate).getTime();
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
    const start = new Date(this.config.marquee.startDate ?? this.config.startDate).getTime();
    const end   = new Date(`${this.config.marquee.endDate ?? this.config.endDate}T23:59:59`).getTime();
    return now >= start && now <= end;
  }

  private readDismissedState(): boolean {
    const storageKey = this.getDismissedStorageKey();
    if (!storageKey || !isPlatformBrowser(this.platformId)) {
      return false;
    }
    return window.localStorage.getItem(storageKey) === 'true';
  }

  private persistDismissedState(dismissed: boolean): void {
    const storageKey = this.getDismissedStorageKey();
    if (!storageKey || !isPlatformBrowser(this.platformId)) {
      return;
    }
    window.localStorage.setItem(storageKey, String(dismissed));
  }

  private getDismissedStorageKey(): string | null {
    if (!this.config?.id) {
      return null;
    }
    return `${EventBannerComponent.DISMISSED_STORAGE_KEY_PREFIX}${this.config.id}`;
  }
}
