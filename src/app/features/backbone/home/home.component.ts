import { AsyncPipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, PLATFORM_ID } from '@angular/core';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import { SeoAndUtilsService } from '../seo-and-utils.service';
import { HomeApiSectionComponent } from './components/home-api-section/home-api-section.component';
import { HomeClosingCtaComponent } from './components/home-closing-cta/home-closing-cta.component';
import { HomeDiscoverySectionComponent } from './components/home-discovery-section/home-discovery-section.component';
import { HomeExperienceHeroComponent } from './components/home-experience-hero/home-experience-hero.component';
import { HomeOpenSectionComponent } from './components/home-open-section/home-open-section.component';
import { HomeProofStripComponent } from './components/home-proof-strip/home-proof-strip.component';
import { HomeSwitchSectionComponent } from './components/home-switch-section/home-switch-section.component';
import { HomeSystemTourComponent } from './components/home-system-tour/home-system-tour.component';
import { HomeDataService } from './home-data.service';
import {
  HOME_API_DOCS_URL,
  HOME_API_FACTS,
  HOME_HERO,
  HOME_OPEN_PILLARS,
  HOME_SWITCH_BENEFITS,
  HOME_SWITCH_STEPS,
  HOME_TOUR_TABS
} from './home-copy';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home',
  styleUrls: ['./home.component.scss'],
  templateUrl: './home.component.html',
  standalone: true,
  imports: [
    AsyncPipe,
    HomeApiSectionComponent,
    HomeClosingCtaComponent,
    HomeDiscoverySectionComponent,
    HomeExperienceHeroComponent,
    HomeOpenSectionComponent,
    HomeProofStripComponent,
    HomeSwitchSectionComponent,
    HomeSystemTourComponent,
  ],
  providers: [HomeDataService]
})
export class HomeComponent {
  readonly hero = HOME_HERO;
  readonly tourTabs = HOME_TOUR_TABS;
  readonly switchSteps = HOME_SWITCH_STEPS;
  readonly switchBenefits = HOME_SWITCH_BENEFITS;
  readonly openPillars = HOME_OPEN_PILLARS;
  readonly apiFacts = HOME_API_FACTS;
  readonly apiDocsUrl = HOME_API_DOCS_URL;

  constructor(
    readonly homeData: HomeDataService,
    seoAndUtilsService: SeoAndUtilsService,
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {
    const seoData: SeoSocialShareData = {
      title: 'Patcher: your operating system for everything modular',
      description: 'Free, open-source workspace for Eurorack. Browse 10,000+ modules, plan racks with power analysis, document patches, import racks from ModularGrid and build on the public API.',
      keywords: 'eurorack, modular synth, rack planner, patch documentation, module database, modulargrid alternative, modulargrid import, open source',
      type: 'website',
      url: 'https://patcher.xyz/',
    };

    seoAndUtilsService.updateSeo(seoData, 'Home');
  }

  scrollToSwitch(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const reduceMotion = this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.document.getElementById('switch')?.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block: 'start'});
  }
}
