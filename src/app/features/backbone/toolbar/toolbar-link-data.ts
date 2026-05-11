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

export function getToolbarHomeLinks(): RouteClickableLink[] {
  return [...HOME_LINKS];
}

export function getToolbarMainLinks(isDev: boolean): RouteClickableLink[] {
  if (!isDev) {
    return [...MAIN_LINKS];
  }

  return [
    ...MAIN_LINKS.slice(0, 3),
    INSIGHTS_LINK,
    ...MAIN_LINKS.slice(3)
  ];
}

export function getToolbarAdminLinks(): RouteClickableLink[] {
  return [...ADMIN_LINKS];
}

export function buildToolbarUserLinks(username: string): RouteClickableLink[] {
  return [
    {
      label: 'My profile',
      route: '/user/area',
      icon: 'dashboard',
      disabled: false
    },
    {
      label: username,
      route: '/user/account',
      icon: 'manage_accounts',
      disabled: false
    }
  ];
}

export function buildToolbarGuestLinks(): RouteClickableLink[] {
  return [
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
}

export function buildWideShellAccountLinks(isLoggedIn: boolean, username: string): RouteClickableLink[] {
  const baseLinks = isLoggedIn
    ? buildToolbarUserLinks(username)
    : buildToolbarGuestLinks();

  return baseLinks.map((link) => {
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
}

export function buildToolbarSections(isLoggedIn: boolean, username: string, isAdmin: boolean, isDev: boolean): ToolbarMobileSection[] {
  const accountLinks = isLoggedIn ? buildToolbarUserLinks(username) : buildToolbarGuestLinks();
  const sections: ToolbarMobileSection[] = [
    {label: 'Quick links', links: getToolbarHomeLinks()},
    {label: 'Browse', links: getToolbarMainLinks(isDev)},
    {label: isLoggedIn ? 'Your account' : 'Account', links: accountLinks}
  ];

  if (isAdmin) {
    sections.push({label: 'Admin', links: getToolbarAdminLinks()});
  }

  return sections;
}

export function getWideShellQuickTargets(isDev: boolean): RouteClickableLink[] {
  return [
    ...getToolbarHomeLinks(),
    ...getToolbarMainLinks(isDev)
  ];
}
