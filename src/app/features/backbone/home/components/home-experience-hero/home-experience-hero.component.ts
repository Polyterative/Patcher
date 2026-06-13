import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { PatchModule } from 'src/app/components/patch-parts/patch.module';
import {
  fromEvent,
  merge,
  Observable,
  of,
  Subject,
  Subscription,
  timer
} from 'rxjs';
import {
  auditTime,
  take,
  takeUntil
} from 'rxjs/operators';
import { AppShellLayoutService } from 'src/app/shared-interproject/app-shell-layout.service';
import { WideShellToolbarComponent } from 'src/app/shared-interproject/components/@visual/wide-shell-toolbar/wide-shell-toolbar.component';
import { HomeHeroContent, HomeHeroVisual } from '../../home-content.models';
import { buildHomeTextSegments } from '../../home-text-segments.util';


const HERO_DEFAULT_PATCH_ID = 5;
const HERO_PATCH_LOAD_DELAY_MS = 1000;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-experience-hero',
  templateUrl: './home-experience-hero.component.html',
  styleUrls: ['./home-experience-hero.component.scss'],
  standalone: true,
  imports: [CommonModule, PatchModule, WideShellToolbarComponent]
})
export class HomeExperienceHeroComponent implements AfterViewInit, OnInit, OnDestroy {
  private _content: HomeHeroContent = {
    eyebrow: '',
    title: '',
    subtitle: '',
    mainVisual: {
      src: '',
      alt: ''
    }
  };
  private subtitleSegmentsByLine = new Map<string, ReturnType<typeof buildHomeTextSegments>>();

  @Input()
  set content(value: HomeHeroContent) {
    this._content = value ?? {
      eyebrow: '',
      title: '',
      subtitle: '',
      mainVisual: {
        src: '',
        alt: ''
      }
    };
    this.subtitleLines = this._content.subtitle
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    this.subtitleSegmentsByLine = new Map(
      this.subtitleLines.map((line) => [line, buildHomeTextSegments(line, this._content.subtitleKeywords ?? [])])
    );
  }

  get content(): HomeHeroContent {
    return this._content;
  }

  public readonly wideShell$: Observable<boolean>;
  public showCompactWideShellToolbar = false;
  public subtitleLines: string[] = [];
  @ViewChild('wideShellToolbarOrigin')
  private wideShellToolbarOrigin?: ElementRef<HTMLElement>;
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  private heroPatchLoadSub?: Subscription;
  private isWideShellActive = false;

  constructor(
    private readonly appShellLayoutService: AppShellLayoutService,
    public readonly patchDetailDataService: PatchDetailDataService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    this.wideShell$ = this.appShellLayoutService.wideShell$;
    this.content = this._content;
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.wideShell$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((wideShell) => {
      this.isWideShellActive = wideShell;
      this.syncCompactWideShellToolbar();
    });

    merge(
      of(null),
      fromEvent(window, 'scroll', {passive: true}),
      fromEvent(window, 'resize')
    ).pipe(
      auditTime(16),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.syncCompactWideShellToolbar();
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.heroPatchLoadSub = timer(HERO_PATCH_LOAD_DELAY_MS)
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe(() => {
        this.patchDetailDataService.updateSinglePatchData$.next(HERO_DEFAULT_PATCH_ID);
      });
  }

  ngOnDestroy(): void {
    this.heroPatchLoadSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  getSubtitleSegments(line: string) {
    return this.subtitleSegmentsByLine.get(line) ?? [];
  }

  getVisualCaptionSegments(visual: HomeHeroVisual) {
    return buildHomeTextSegments(visual.caption ?? '', visual.captionKeywords ?? []);
  }

  private syncCompactWideShellToolbar(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const nextCompactVisibility = this.shouldShowCompactWideShellToolbar();

    if (this.showCompactWideShellToolbar === nextCompactVisibility) {
      return;
    }

    this.showCompactWideShellToolbar = nextCompactVisibility;
    this.changeDetectorRef.markForCheck();
  }

  private shouldShowCompactWideShellToolbar(): boolean {
    if (!this.isWideShellActive || !this.wideShellToolbarOrigin?.nativeElement) {
      return false;
    }

    const navRect = this.wideShellToolbarOrigin.nativeElement.getBoundingClientRect();
    const revealThresholdPx = Math.min(Math.max(navRect.height * 0.1, 8), 20);
    return navRect.bottom <= revealThresholdPx;
  }
}
