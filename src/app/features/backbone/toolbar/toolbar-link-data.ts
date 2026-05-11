import { RouteClickableLink } from 'src/app/shared-interproject/components/@smart/route-clickable-link/route-clickable-link.component';


export interface ToolbarMobileSection {
  label: string;
  links: RouteClickableLink[];
}

const HOME_LINKS: RouteClickableLink[] = [
  {
    label: 'Home',
    route: '/home',
    icon: 'home',
    disabled: false
  }
];

const MAIN_LINKS: RouteClickableLink[] = [
  {
    label: 'Modules',
    route: '/modules/browser',
    icon: 'view_module',
    disabled: false
  },
  {
    label: 'Racks',
    route: '/racks/browser',
    icon: 'view_stream',
    disabled: false
  },
  {
    label: 'Patches',
    route: '/patches/browser',
    icon: 'settings_input_composite',
    disabled: false
  },
  {
    label: 'Manufacturers',
    route: '/manufacturers/browser',
    icon: 'handyman',
    disabled: false
  }
];

const INSIGHTS_LINK: RouteClickableLink = {
  label: 'Insights',
  route: '/insights',
  icon: 'insights',
  disabled: false
};

const ADMIN_LINKS: RouteClickableLink[] = [
  {
    label: 'Admin',
    route: '/admin',
    icon: 'admin_panel_settings',
    disabled: false
  }
];

const DEV_MAIN_LINKS: RouteClickableLink[] = [
  ...MAIN_LINKS.slice(0, 3),
  INSIGHTS_LINK,
  ...MAIN_LINKS.slice(3)
];

const guestLinksCache = [
  {
    label: 'Log in',
    route: '/auth/login',
    icon: 'login',
    disabled: false
  },
  {
    label: 'Sign up',
    route: '/auth/signup',
    icon: 'account_circle',
    style: {border: '1px solid rgba(210, 210, 210, 0.7)'},
    disabled: false
  }
];
const userLinksCache = new Map<string, RouteClickableLink[]>();
const wideShellAccountLinksCache = new Map<string, RouteClickableLink[]>();
const toolbarSectionsCache = new Map<string, ToolbarMobileSection[]>();
const wideShellQuickTargetsCache = new Map<'dev' | 'prod', RouteClickableLink[]>();

export function getToolbarHomeLinks(): RouteClickableLink[] {
  return HOME_LINKS;
}

export function getToolbarMainLinks(isDev: boolean): RouteClickableLink[] {
  return isDev ? DEV_MAIN_LINKS : MAIN_LINKS;
}

export function getToolbarAdminLinks(): RouteClickableLink[] {
  return ADMIN_LINKS;
}

export function buildToolbarUserLinks(username: string): RouteClickableLink[] {
  const normalizedUsername = username.trim() || 'Account';
  const cachedLinks = userLinksCache.get(normalizedUsername);
  if (cachedLinks) {
    return cachedLinks;
  }

  const nextLinks = [
    {
      label: 'My profile',
      route: '/user/area',
      icon: 'dashboard',
      disabled: false
    },
    {
      label: normalizedUsername,
      route: '/user/account',
      icon: 'manage_accounts',
      disabled: false
    }
  ];
  userLinksCache.set(normalizedUsername, nextLinks);
  return nextLinks;
}

export function buildToolbarGuestLinks(): RouteClickableLink[] {
  return guestLinksCache;
}

export function buildWideShellAccountLinks(isLoggedIn: boolean, username: string): RouteClickableLink[] {
  const cacheKey = `${ isLoggedIn ? 'user' : 'guest' }:${ username.trim() || 'Account' }`;
  const cachedLinks = wideShellAccountLinksCache.get(cacheKey);
  if (cachedLinks) {
    return cachedLinks;
  }

  const baseLinks = isLoggedIn
    ? buildToolbarUserLinks(username)
    : buildToolbarGuestLinks();

  const nextLinks = baseLinks.map((link) => {
    if (link.route === '/user/area') {
      return {
        ...link,
        label: 'Profile'
      };
    }

    if (link.route === '/user/account') {
      return {
        ...link,
        label: 'Account'
      };
    }

    return link;
  });
  wideShellAccountLinksCache.set(cacheKey, nextLinks);
  return nextLinks;
}

export function buildToolbarSections(isLoggedIn: boolean, username: string, isAdmin: boolean, isDev: boolean): ToolbarMobileSection[] {
  const cacheKey = `${ isLoggedIn ? 1 : 0 }:${ username.trim() || 'Account' }:${ isAdmin ? 1 : 0 }:${ isDev ? 1 : 0 }`;
  const cachedSections = toolbarSectionsCache.get(cacheKey);
  if (cachedSections) {
    return cachedSections;
  }

  const accountLinks = isLoggedIn ? buildToolbarUserLinks(username) : buildToolbarGuestLinks();
  const sections: ToolbarMobileSection[] = [
    {label: 'Quick links', links: getToolbarHomeLinks()},
    {label: 'Browse', links: getToolbarMainLinks(isDev)},
    {label: isLoggedIn ? 'Your account' : 'Account', links: accountLinks}
  ];

  if (isAdmin) {
    sections.push({label: 'Admin', links: getToolbarAdminLinks()});
  }

  toolbarSectionsCache.set(cacheKey, sections);
  return sections;
}

export function getWideShellQuickTargets(isDev: boolean): RouteClickableLink[] {
  const cacheKey = isDev ? 'dev' : 'prod';
  const cachedTargets = wideShellQuickTargetsCache.get(cacheKey);
  if (cachedTargets) {
    return cachedTargets;
  }

  const nextTargets = [
    ...getToolbarHomeLinks(),
    ...getToolbarMainLinks(isDev)
  ];
  wideShellQuickTargetsCache.set(cacheKey, nextTargets);
  return nextTargets;
}
