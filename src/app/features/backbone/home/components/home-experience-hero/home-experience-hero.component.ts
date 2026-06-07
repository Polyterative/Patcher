import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { PatchModule } from 'src/app/components/patch-parts/patch.module';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  buildWideShellAccountLinks,
  getWideShellQuickTargets
} from 'src/app/features/backbone/toolbar/toolbar-link-data';
import {
  combineLatest,
  Observable,
  Subject,
  Subscription,
  timer
} from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  take,
  takeUntil
} from 'rxjs/operators';
import {
  getRouteClickableLinkKey,
  RouteClickableLink
} from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link.component';
import { AppShellLayoutService } from 'src/app/shared-interproject/app-shell-layout.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
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
  imports: [CommonModule, RouterModule, PatchModule]
})
export class HomeExperienceHeroComponent implements OnInit, OnDestroy {
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
  public readonly wideShellTargets: RouteClickableLink[];
  public readonly accountLinks$: Observable<RouteClickableLink[]>;
  public readonly shellVm$: Observable<{
    wideShell: boolean;
    accountLinks: RouteClickableLink[];
  }>;
  public readonly siteTitle = 'patcher.xyz';
  public subtitleLines: string[] = [];
  private readonly destroy$ = new Subject<void>();
  private heroPatchLoadSub?: Subscription;

  constructor(
    private readonly appShellLayoutService: AppShellLayoutService,
    private readonly appState: AppStateService,
    private readonly userManagementService: UserManagementService,
    public readonly patchDetailDataService: PatchDetailDataService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    this.wideShell$ = this.appShellLayoutService.wideShell$;
    this.wideShellTargets = getWideShellQuickTargets(this.appState.isDev);
    this.accountLinks$ = combineLatest([
      this.userManagementService.loggedUser$.pipe(startWith(undefined)),
      this.userManagementService.loggedUserFullProfile$.pipe(startWith(undefined)),
      this.userManagementService.isAdmin$.pipe(startWith(false))
    ]).pipe(
      map(([loggedUser, profile, isAdmin]) => buildWideShellAccountLinks(
        Boolean(loggedUser),
        profile?.username?.trim() || 'Account',
        isAdmin
      )),
      distinctUntilChanged(),
      shareReplay({bufferSize: 1, refCount: true})
    );
    this.shellVm$ = combineLatest([
      this.wideShell$,
      this.accountLinks$
    ]).pipe(
      map(([wideShell, accountLinks]) => ({
        wideShell,
        accountLinks
      })),
      shareReplay({bufferSize: 1, refCount: true})
    );
    this.content = this._content;
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

  trackByNavLink(index: number, item: RouteClickableLink): string {
    return getRouteClickableLinkKey(item);
  }
}
