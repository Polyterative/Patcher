import {
  HomeApiFact,
  HomeBenefit,
  HomeHeroContent,
  HomeOpenPillar,
  HomeSwitchStep,
  HomeTourTab
} from './home-content.models';

// Homepage copy lives here so wording can be reviewed in one place.
// Every claim must match shipped, production-visible behaviour (see the plan's
// Decision log): no flag-gated features, no claims about other products beyond
// what the FAQ already states.

export const HOME_HERO: HomeHeroContent = {
  eyebrow: 'Free and open source, for Eurorack',
  title: 'Your operating system for everything modular.',
  lede: 'Keep your modules, rack plans and patches in one place. Plan the case before you buy, and come back to last month\'s patch with every cable written down.',
  graphCaption: 'Drawn live from a public patch. Log your cables and Patcher draws yours the same way.'
};

const SHOT_ROOT = '/assets/home';

export const HOME_TOUR_TABS: HomeTourTab[] = [
  {
    id: 'library',
    label: 'Library',
    icon: 'view_module',
    title: 'Module specs without the forum digging.',
    description: 'A free catalogue maintained by the people who own the gear. Add what you own once and it is ready for every rack and patch.',
    points: [
      'HP, depth and current draw per rail on every module page',
      'Inputs and outputs listed jack by jack',
      'Missing a module? Add it yourself and the community reviews it'
    ],
    link: {label: 'Browse modules', href: '/modules/browser'},
    shot: {
      light: `${SHOT_ROOT}/tour-library-light.webp`,
      dark: `${SHOT_ROOT}/tour-library-dark.webp`,
      alt: 'Module page for Make Noise Maths in Patcher with the panel, HP, depth, power draw and jack list'
    }
  },
  {
    id: 'racks',
    label: 'Racks',
    icon: 'dashboard_customize',
    title: 'Plan the case before you move a screw.',
    description: 'Lay out rows of any width, try changes on screen and check what the power supply has to deliver.',
    points: [
      'Drag-and-drop layout across multiple rows',
      'Live HP, power per rail and balance analysis',
      'Export a JPEG, or duplicate a public rack as your starting point'
    ],
    link: {label: 'Browse racks', href: '/racks/browser'},
    shot: {
      light: `${SHOT_ROOT}/tour-racks-light.webp`,
      dark: `${SHOT_ROOT}/tour-racks-dark.webp`,
      alt: 'A two-row Eurorack case planned in Patcher, with Rings, Batumi, Mimeophon and other module panels in place'
    }
  },
  {
    id: 'patches',
    label: 'Patches',
    icon: 'cable',
    title: 'Patches you can rebuild next month.',
    description: 'Log each cable as you patch. Patcher draws the graph and keeps your notes on the cables they explain.',
    points: [
      'Connection graph with a note on any cable',
      'Numbered copies when the same module appears twice',
      'Saved as you go, private until you choose to share'
    ],
    link: {label: 'Browse patches', href: '/patches/browser'},
    shot: {
      light: `${SHOT_ROOT}/tour-patches-light.webp`,
      dark: `${SHOT_ROOT}/tour-patches-dark.webp`,
      alt: 'Patch page in Patcher with the connection graph, patch statistics and cable list'
    }
  }
];

export const HOME_SWITCH_STEPS: HomeSwitchStep[] = [
  {
    label: 'Export',
    description: 'In ModularGrid, export your rack as JSON. Their export needs a Unicorn account.'
  },
  {
    label: 'Import',
    description: 'In Patcher, create a rack, turn on "Import from ModularGrid" and drop the file in.'
  },
  {
    label: 'Review',
    description: 'Matches are sorted by confidence. Resolve the few that need you, then save.'
  }
];

export const HOME_SWITCH_BENEFITS: HomeBenefit[] = [
  {
    icon: 'cable',
    title: 'Document your patches',
    description: 'Record how the system is wired, cable by cable, with notes.'
  },
  {
    icon: 'lock_open',
    title: 'Every feature, free',
    description: 'There is no paid tier. Patcher runs on optional donations.'
  },
  {
    icon: 'code',
    title: 'Open code, open data',
    description: 'AGPL-3.0 source on GitHub and a public API for the catalogue.'
  },
  {
    icon: 'devices',
    title: 'Works where you patch',
    description: 'Desktop, tablet or phone, in light or dark.'
  }
];

export const HOME_OPEN_PILLARS: HomeOpenPillar[] = [
  {
    icon: 'volunteer_activism',
    title: 'Free for everyone',
    description: 'No tiers and nothing locked. If Patcher helps you, support it on Patreon from €1.',
    link: {label: 'Support on Patreon', href: 'https://www.patreon.com/patcher'}
  },
  {
    icon: 'code',
    title: 'Open source',
    description: 'The whole app is AGPL-3.0. Read the code, open issues, send pull requests.',
    link: {label: 'View on GitHub', href: 'https://github.com/Polyterative/Patcher'}
  },
  {
    icon: 'forum',
    title: 'Run with the community',
    description: 'Module data, roadmap and bug reports are discussed in the open on Discord.',
    link: {label: 'Join the Discord', href: 'https://discord.gg/JNy2HTb5ru'}
  }
];

// Quotas and coverage mirror cloudflare/public-api/README.md and openapi.yaml.
export const HOME_API_DOCS_URL = 'https://docs.patcher.xyz/reference/public-open-api';

export const HOME_API_FACTS: HomeApiFact[] = [
  {
    icon: 'view_module',
    title: 'The whole public catalogue',
    description: 'Modules with HP, depth, power per rail, every jack, tags and panel images. Manufacturers, standards and tags too.'
  },
  {
    icon: 'key',
    title: 'A free key from your account',
    description: 'Each key includes 5,000 requests a month, up to 60 a minute.'
  },
  {
    icon: 'description',
    title: 'Documented contract',
    description: 'An OpenAPI 3.1 spec, cursor pagination, field selection and ETags for cheap re-checks.'
  }
];
