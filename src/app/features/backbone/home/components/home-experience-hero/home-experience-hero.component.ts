import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { PatchModule } from 'src/app/components/patch-parts/patch.module';
import {
  Subscription,
  timer
} from 'rxjs';
import {
  take,
} from 'rxjs/operators';
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
  imports: [CommonModule, PatchModule]
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

  public subtitleLines: string[] = [];
  private heroPatchLoadSub?: Subscription;

  constructor(
    public readonly patchDetailDataService: PatchDetailDataService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    this.content = this._content;
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.heroPatchLoadSub = timer(HERO_PATCH_LOAD_DELAY_MS)
      .pipe(take(1))
      .subscribe(() => {
        this.patchDetailDataService.updateSinglePatchData$.next(HERO_DEFAULT_PATCH_ID);
      });
  }

  ngOnDestroy(): void {
    this.heroPatchLoadSub?.unsubscribe();
  }

  getSubtitleSegments(line: string) {
    return this.subtitleSegmentsByLine.get(line) ?? [];
  }

  getVisualCaptionSegments(visual: HomeHeroVisual) {
    return buildHomeTextSegments(visual.caption ?? '', visual.captionKeywords ?? []);
  }

}
