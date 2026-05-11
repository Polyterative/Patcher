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
  map,
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
  @Input() content: HomeHeroContent = {
    eyebrow: '',
    title: '',
    subtitle: '',
    mainVisual: {
      src: '',
      alt: ''
    }
  };

  public readonly wideShell$: Observable<boolean>;
  public readonly wideShellTargets: RouteClickableLink[];
  public readonly accountLinks$: Observable<RouteClickableLink[]>;
  public readonly siteTitle = 'patcher.xyz';

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
      ))
    );
  }
  
  getSubtitleLines() {
    return this.content.subtitle
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  getSubtitleSegments(line: string) {
    return buildHomeTextSegments(line, this.content.subtitleKeywords ?? []);
  }
}
