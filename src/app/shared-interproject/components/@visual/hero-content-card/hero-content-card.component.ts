import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  fromEvent,
  merge,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  auditTime,
  takeUntil
} from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppShellLayoutService } from 'src/app/shared-interproject/app-shell-layout.service';
import { WideShellToolbarComponent } from 'src/app/shared-interproject/components/@visual/wide-shell-toolbar/wide-shell-toolbar.component';
import { HeroContentCardHeadIconComponent } from './hero-contenst-card-head-icon/hero-content-card-head-icon.component';


/**
 *  UI ONLY COMPONENT
 */
@Component({
  selector: 'lib-hero-content-card',
  templateUrl: './hero-content-card.component.html',
  styleUrls: ['./hero-content-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    WideShellToolbarComponent,
    HeroContentCardHeadIconComponent
  ]
})
export class HeroContentCardComponent implements AfterViewInit, OnDestroy {
  @Input() titleBig: string;
  @Input() titleNormal: string;
  @Input() titleSub: string;
  @Input() top = false;
  @Input() bottom = false;
  @Input() sidesPadding = true;
  @Input() vertPadding = true;
  @Input() description: string;
  @Input() descriptionAlign: 'alignTextStart' | 'alignTextEnd' = 'alignTextEnd';
  @Input() showHelpButton = false;
  @Input() icon: string;
  @Input() showWideShellNav = false;
  @Input() compactTitleSub = false;
  @ViewChild('wideShellNavOrigin')
  set wideShellNavOriginRef(value: ElementRef<HTMLElement> | undefined) {
    this.wideShellNavOrigin = value;
    this.syncCompactWideShellNav();
  }

  public readonly wideShell$: Observable<boolean>;
  public showCompactWideShellNav = false;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly destroy$ = new Subject<void>();
  private wideShellNavOrigin?: ElementRef<HTMLElement>;
  private isWideShellActive = false;

  constructor(
    private readonly appShellLayoutService: AppShellLayoutService,
  ) {
    this.wideShell$ = this.appShellLayoutService.wideShell$;
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.wideShell$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((wideShell) => {
      this.isWideShellActive = wideShell;
      this.syncCompactWideShellNav();
    });

    merge(
      of(null),
      fromEvent(window, 'scroll', {passive: true}),
      fromEvent(window, 'resize')
    ).pipe(
      auditTime(16),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.syncCompactWideShellNav();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private syncCompactWideShellNav(): void {
    if (!this.isBrowser) {
      return;
    }

    const nextCompactVisibility = this.shouldShowCompactWideShellNav();
    const hasVisibilityChanged = this.showCompactWideShellNav !== nextCompactVisibility;

    if (!hasVisibilityChanged) {
      return;
    }

    this.showCompactWideShellNav = nextCompactVisibility;
    this.changeDetectorRef.markForCheck();
  }

  private shouldShowCompactWideShellNav(): boolean {
    if (!this.showWideShellNav || !this.isWideShellActive || !this.wideShellNavOrigin?.nativeElement) {
      return false;
    }

    const navRect = this.wideShellNavOrigin.nativeElement.getBoundingClientRect();
    const revealThresholdPx = Math.min(Math.max(navRect.height * 0.1, 8), 20);
    return navRect.bottom <= revealThresholdPx;
  }
}
