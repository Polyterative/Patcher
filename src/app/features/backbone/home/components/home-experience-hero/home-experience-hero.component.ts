import {
  Component,
  Input
} from '@angular/core';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import {
  buildWideShellAccountLinks,
  getWideShellQuickTargets
} from 'src/app/features/backbone/toolbar/toolbar-link-data';
import {
  combineLatest,
  Observable
} from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  startWith
} from 'rxjs/operators';
import { RouteClickableLink } from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link.component';
import { AppShellLayoutService } from 'src/app/shared-interproject/app-shell-layout.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { HomeHeroContent } from '../../home-content.models';
import { buildHomeTextSegments } from '../../home-text-segments.util';


@Component({
  selector: 'app-home-experience-hero',
  templateUrl: './home-experience-hero.component.html',
  styleUrls: ['./home-experience-hero.component.scss'],
  standalone: false
})
export class HomeExperienceHeroComponent {
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

  constructor(
    private readonly appShellLayoutService: AppShellLayoutService,
    private readonly appState: AppStateService,
    private readonly userManagementService: UserManagementService
  ) {
    this.wideShell$ = this.appShellLayoutService.wideShell$;
    this.wideShellTargets = getWideShellQuickTargets(this.appState.isDev);
    this.accountLinks$ = combineLatest([
      this.userManagementService.loggedUser$.pipe(startWith(undefined)),
      this.userManagementService.loggedUserFullProfile$.pipe(startWith(undefined))
    ]).pipe(
      map(([loggedUser, profile]) => buildWideShellAccountLinks(
        Boolean(loggedUser),
        profile?.username?.trim() || 'Account'
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
  
  getSubtitleSegments(line: string) {
    return this.subtitleSegmentsByLine.get(line) ?? [];
  }
}
