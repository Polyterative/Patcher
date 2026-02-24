import { Component } from '@angular/core';
import { timer } from 'rxjs';
import {
  take,
  takeUntil
} from 'rxjs/operators';
import { ModuleDetailDataService } from 'src/app/components/module-parts/module-detail-data.service';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import {
  defaultPatchMinimalViewConfig,
  PatchMinimalViewConfig
} from 'src/app/components/patch-parts/patch-minimal/patch-minimal.component';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import {
  defaultRackMinimalViewConfig,
  RackMinimalViewConfig
} from 'src/app/components/rack-parts/rack-minimal/rack-minimal.component';
import { SeoSocialShareData } from 'src/app/models/seo.model';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SeoAndUtilsService } from '../seo-and-utils.service';
import {
  HomeFounderNote,
  HomeHeroContent,
  HomeLinkPill,
  HomePrincipleCard,
  HomeProofSection,
  HomeWorkflowStep
} from './home-content.models';


@Component({
  selector: 'app-home',
  styleUrls: ['./home.component.scss'],
  templateUrl: './home.component.html',
  providers: [
    PatchDetailDataService,
    RackDetailDataService,
    ModuleDetailDataService
  ],
  standalone: false
})
export class HomeComponent extends SubManager {
  readonly patchViewConfig: PatchMinimalViewConfig = {
    ...defaultPatchMinimalViewConfig,
    hideButtons: true,
  };
  readonly rackViewConfig: RackMinimalViewConfig = {
    ...defaultRackMinimalViewConfig,
  };
  readonly moduleViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hidePanelsOptions: true,
    bigPanelImage: false,
    ellipseDescription: true,
    hideBySameManufacturer: true,
    hidePatchedIn: false,
    hideRackedIn: false
  };
  
  readonly heroContent: HomeHeroContent = {
    eyebrow: 'made for musicians',
    title: 'Never forget a great patch again.',
    subtitle: 'Track every setup in clear detail so you can rebuild the exact sound for the next gig without losing time.',
    mainVisual: {
      src: '/assets/screenshots/major-area-screenshots/04-patches.jpg',
      alt: 'Patcher patch detail interface with patch notes and controls',
      caption: 'Capture the full patch while it is fresh, then reopen it later and recreate it pefectly for the next gig.'
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
      title: 'Explore what fits your sound',
      description: 'Browse modules and narrow quickly to what actually fits your goals.'
    },
    {
      kicker: 'step 02',
      title: 'Capture the patch while you build',
      description: 'Record choices as you go so strong ideas do not disappear after the session.'
    },
    {
      kicker: 'step 03',
      title: 'Shape the rack before rewiring',
      description: 'Test layout ideas on screen before moving real hardware.'
    },
    {
      kicker: 'step 04',
      title: 'Come back and recreate fast',
      description: 'Open a past session and rebuild with confidence in minutes.'
    }
  ];
  
  readonly proofSections: HomeProofSection[] = [
    {
      kind: 'patch',
      kicker: 'auto-save patch details',
      title: 'Turn sessions into repeatable results',
      description: 'Save settings, cable routes, and notes while you patch, then reopen everything before rehearsal and rebuild it fast.',
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
  
  readonly communityLinks: HomeLinkPill[] = [
    {
      icon: 'menu_book',
      label: 'Patch browser',
      href: '/patches/browser'
    },
    {
      icon: 'view_module',
      label: 'Module browser',
      href: '/modules/browser'
    },
    {
      icon: 'person',
      label: 'Rack browser',
      href: '/racks/browser'
    }
  ];
  
  readonly userStories: HomeFounderNote[] = [
    {
      quote: 'I rebuilt my live set from six weeks ago in one rehearsal because every patch step was still there.',
      author: 'Lena R.',
      role: 'live performer'
    },
    {
      quote: 'Drag-and-drop rack planning helped me test layouts in minutes before touching a single cable.',
      author: 'Marco T.',
      role: 'studio producer'
    },
    {
      quote: 'The module pages answered spec questions I could not find anywhere else, so I bought with confidence.',
      author: 'Ari N.',
      role: 'modular collector'
    },
    {
      quote: 'I can leave a patch for weeks, come back, and get the same sound fast instead of guessing from memory.',
      author: 'Noah K.',
      role: 'sound designer'
    }
  ];
  
  private readonly delayTime = 500;

  constructor(
    readonly patchDetailDataService: PatchDetailDataService,
    readonly rackDetailDataService: RackDetailDataService,
    readonly moduleDetailDataService: ModuleDetailDataService,
    readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    super();

    const seoData: SeoSocialShareData = {
      title: 'Patcher home',
      description: 'Free open-source workspace for Eurorack musicians to capture ideas, plan racks, and return to patches quickly.',
      keywords: 'eurorack, modular, digital twin, patch editor, rack planning, module database, auto-save, instance-aware patching',
      type: 'website',
    };
    
    this.seoAndUtilsService.updateSeo(seoData, 'Home');

    timer(this.delayTime * 2)
      .pipe(
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.patchDetailDataService.updateSinglePatchData$.next(5);
      });

    timer(this.delayTime * 4)
      .pipe(
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.moduleDetailDataService.updateSingleModuleData$.next(1025);
      });
    
    timer(this.delayTime * 6)
      .pipe(
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.rackDetailDataService.updateSingleRackData$.next(265);
      });
  }
}
