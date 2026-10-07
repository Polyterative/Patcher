import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Observable, combineLatest, map, take, timer } from 'rxjs';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { PatchModule } from 'src/app/components/patch-parts/patch.module';
import { DETAIL_ANALYTICS_SURFACES } from 'src/app/components/detail-analytics-surface';
import { PatchConnection } from 'src/app/models/connection';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { HomeCtaClick, HomeHeroContent } from '../../home-content.models';

const HERO_DEFAULT_PATCH_ID = 5;
const HERO_PATCH_LOAD_DELAY_MS = 600;

export interface HomeHeroPatchMeta {
  name: string;
  modules: number;
  cables: number;
}

export function buildHeroPatchMeta(name: string | undefined, connections: PatchConnection[] | null): HomeHeroPatchMeta | null {
  if (!name || !connections?.length) {
    return null;
  }
  const moduleKeys = new Set<string>();
  for (const connection of connections) {
    moduleKeys.add(`${connection.a.module.id}:${connection.instance_id_a ?? ''}`);
    moduleKeys.add(`${connection.b.module.id}:${connection.instance_id_b ?? ''}`);
  }
  return {name, modules: moduleKeys.size, cables: connections.length};
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-experience-hero',
  templateUrl: './home-experience-hero.component.html',
  styleUrls: ['./home-experience-hero.component.scss'],
  standalone: true,
  imports: [BrandPrimaryButtonComponent, CommonModule, PatchModule]
})
export class HomeExperienceHeroComponent extends SubManager implements OnInit {
  @Input({required: true}) content!: HomeHeroContent;
  @Input() isSignedIn = false;
  @Output() readonly ctaClicked = new EventEmitter<HomeCtaClick>();
  @Output() readonly switchRequested = new EventEmitter<void>();

  readonly patchMeta$: Observable<HomeHeroPatchMeta | null>;

  constructor(
    public readonly patchDetailDataService: PatchDetailDataService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    super();
    this.patchDetailDataService.setDetailAnalyticsSurface(DETAIL_ANALYTICS_SURFACES.homePreview);
    this.patchMeta$ = combineLatest([
      this.patchDetailDataService.singlePatchData$,
      this.patchDetailDataService.patchConnections$
    ]).pipe(map(([patch, connections]) => buildHeroPatchMeta(patch?.name, connections)));
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    timer(HERO_PATCH_LOAD_DELAY_MS)
      .pipe(take(1), this.takeUntilDestroyed())
      .subscribe(() => {
        this.patchDetailDataService.updateSinglePatchData$.next(HERO_DEFAULT_PATCH_ID);
      });
  }

  override ngOnDestroy(): void {
    this.patchDetailDataService.setDetailAnalyticsSurface(DETAIL_ANALYTICS_SURFACES.detailRoute);
    super.ngOnDestroy();
  }

  onSwitchLinkClick(event: Event): void {
    event.preventDefault();
    this.ctaClicked.emit({cta: 'switch_anchor', location: 'hero'});
    this.switchRequested.emit();
  }
}
