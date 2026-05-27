import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StatisticsComponent } from 'src/app/components/shared-atoms/statistics/statistics.component';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { DeviceFrameWrapperModule } from 'src/app/shared-interproject/components/@visual/device-frame-wrapper/device-frame-wrapper.module';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import { SeoAndUtilsService } from '../seo-and-utils.service';
import {
  ApplicationInsightsTeaser,
  ApplicationStatisticsService
} from './application-statistics.service';
import { HomeCuriosityBridgeComponent } from './components/home-curiosity-bridge/home-curiosity-bridge.component';
import { HomeExperienceHeroComponent } from './components/home-experience-hero/home-experience-hero.component';
import { HomeInvitationCtaComponent } from './components/home-invitation-cta/home-invitation-cta.component';
import { HomeOpenPrinciplesComponent } from './components/home-open-principles/home-open-principles.component';
import { HomeProofShowcaseComponent } from './components/home-proof-showcase/home-proof-showcase.component';
import { HomeWorkflowRailComponent } from './components/home-workflow-rail/home-workflow-rail.component';
import {
  HomeFounderNote,
  HomeHeroContent,
  HomeLinkPill,
  HomePrincipleCard,
  HomeProofKind,
  HomeProofSection,
  HomeWorkflowStep
} from './home-content.models';
import { Observable } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home',
  styleUrls: ['./home.component.scss'],
  templateUrl: './home.component.html',
  standalone: true,
  imports: [
    CommonModule,
    BrandPrimaryButtonComponent,
    DeviceFrameWrapperModule,
    HomeCuriosityBridgeComponent,
    HomeExperienceHeroComponent,
    HomeInvitationCtaComponent,
    HomeOpenPrinciplesComponent,
    HomeProofShowcaseComponent,
    HomeWorkflowRailComponent,
    StatisticsComponent,
  ],
  providers: [ApplicationStatisticsService]
})
export class HomeComponent {
  readonly heroContent: HomeHeroContent = {
    eyebrow: '',
    title: 'Your operating system for everything modular.',
    subtitle: 'Track every setup in clear detail\nSave modules to your library and plan racks before moving hardware\nReturn to past patches ready to recreate, refine, and share your sound',
    mainVisual: {
      src: '/assets/screenshots/major-area-screenshots/04-patches.jpg',
      alt: 'Patcher patch detail interface with patch notes and controls',
      caption: 'Capture the full patch while it is fresh, then reopen it later and recreate it perfectly for the next gig.'
    },
    floatingVisualA: {
      src: '/assets/screenshots/major-area-screenshots/03-module-details.jpg',
      alt: 'Module detail card with specs and module image'
    },
    floatingVisualB: {
      src: '/assets/screenshots/major-area-screenshots/07-rack-details.jpg',
      alt: 'Rack detail view showing arrangement and module placements'
    }
  };

  readonly proofPreviewImages: Record<HomeProofKind, { src: string; alt: string }> = {
    patch: {
      src: '/assets/screenshots/major-area-screenshots/04-patches.jpg',
      alt: 'Patch detail preview showing notes and controls'
    },
    rack: {
      src: '/assets/screenshots/major-area-screenshots/07-rack-details.jpg',
      alt: 'Rack planner preview showing arranged modules'
    },
    module: {
      src: '/assets/screenshots/major-area-screenshots/03-module-details.jpg',
      alt: 'Module library preview showing specs and panel image'
    }
  };

  readonly principleCards: HomePrincipleCard[] = [
    {
      icon: 'tips_and_updates',
      title: 'Stay in flow',
      description: 'Your work is saved as you go, so you can focus on sound instead of managing steps.'
    },
    {
      icon: 'auto_awesome',
      title: 'Make big systems feel clear',
      description: 'Complex patches stay understandable, so decisions feel easier and faster.'
    },
    {
      icon: 'group',
      title: 'Share only what you choose',
      description: 'Keep drafts private and publish finished work when you are ready.'
    }
  ];

  readonly workflowSteps: HomeWorkflowStep[] = [
    {
      kicker: 'step 01',
      title: 'Save your modules to your library',
      description: 'Browse modules and add them to your collection.'
    },
    {
      kicker: 'step 02',
      title: 'Shape your rack layout with the drag-and-drop planner',
      description: 'Test layout ideas on screen before moving real hardware.'
    },
    {
      kicker: 'step 03',
      title: 'Capture that cool patch idea before it slips away',
      description: 'Save your patch with all the details while it is fresh, so you can come back to it later and get back to the sound fast.'
    },
    {
      kicker: 'step 04',
      title: 'Come back and recreate fast',
      description: 'Open a past session and rebuild with perfect accuracy for your next rehearsal gig, or share your work with the community when you are ready.'
    }
  ];

  readonly proofSections: HomeProofSection[] = [
    {
      kind: 'patch',
      kicker: 'auto-save patch details',
      title: 'Turn sessions into repeatable results',
      description: 'Save settings, cable routes, and notes while you patch, then reopen your ideas and rebuild them fast.',
      keywords: ['exact setup'],
      tone: 'patch'
    },
    {
      kind: 'rack',
      kicker: 'drag-and-drop rack planner',
      title: 'Quickly plan and iterate changes before touching modules.',
      description: 'Try layout changes visually, compare tradeoffs early, and keep your case organized as it grows.',
      keywords: ['layout changes visually'],
      tone: 'rack'
    },
    {
      kind: 'module',
      kicker: 'free public module library',
      title: 'Find modules with less guesswork',
      description: 'Explore a deeply detailed module library with hard-to-find technical specs, so you can compare with confidence before you buy or patch.',
      keywords: ['hard-to-find technical specs'],
      tone: 'module'
    }
  ];

  readonly communityLinks: HomeLinkPill[];
  readonly showInsightsPageEntry: boolean;
  private readonly browseLinks: HomeLinkPill[] = [
    {
      icon: 'view_module',
      label: 'Module browser',
      href: '/modules/browser'
    },
    {
      icon: 'dashboard_customize',
      label: 'Rack browser',
      href: '/racks/browser'
    },
    {
      icon: 'cable',
      label: 'Patch browser',
      href: '/patches/browser'
    },
  ];
  readonly applicationInsights$!: Observable<ApplicationInsightsTeaser>;
  readonly insightsTitle = 'Open the full insights page';
  readonly insightsDescription =
    'Start with the homepage snapshot, then jump into the dedicated insights page for the fuller read on catalogue growth, activity, and sharing patterns.';

  readonly userStories: HomeFounderNote[] = [
    {
      quote: 'opened a patch from 6 weeks ago before a set, followed my saved steps, and got back to the sound fast.',
      author: 'Lena R.',
      role: 'live performer'
    },
    {
      quote: 'rack planner saved me hours of moving modules around, then finding out the layout was not worth it.',
      author: 'Marco T.',
      role: 'studio producer'
    },
    {
      quote: 'module pages show the exact specs i need, so i am not digging through forums or asking around to find them.',
      author: 'Ari N.',
      role: 'modular collector'
    },
    {
      quote: 'when i forget why i patched something a certain way, the notes inside the patch bring it back instantly.',
      author: 'Noah K.',
      role: 'sound designer'
    }
  ];

  constructor(
    readonly applicationStatisticsService: ApplicationStatisticsService,
    public readonly appState: AppStateService,
    readonly seoAndUtilsService: SeoAndUtilsService,
  ) {
    this.showInsightsPageEntry = this.appState.isDev;
    this.communityLinks = this.showInsightsPageEntry
      ? [
        {
          icon: 'insights',
          label: 'Open insights',
          href: '/info/insights'
        },
        ...this.browseLinks
      ]
      : [...this.browseLinks];
    this.applicationInsights$ = this.applicationStatisticsService.teaser$;

    const seoData: SeoSocialShareData = {
      title: 'Patcher home',
      description: 'Free open-source workspace for Eurorack musicians to capture ideas, plan racks, and return to patches quickly.',
      keywords: 'eurorack, modular, digital twin, patch editor, rack planning, module database, auto-save, instance-aware patching',
      type: 'website',
      url: 'https://patcher.xyz/',
    };

    this.seoAndUtilsService.updateSeo(seoData, 'Home');
  }
}
