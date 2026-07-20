import {
  buildWideShellAccountLinks,
  buildToolbarGuestLinks,
  getToolbarHomeLinks,
  getToolbarMainLinks,
  buildToolbarUserLinks,
  buildToolbarSections,
  getWideShellQuickTargets,
} from './toolbar-link-data';

describe('toolbar-link-data', () => {
  it('shows the logged-in username in the wide-shell profile slot', () => {
    const links = buildWideShellAccountLinks(true, 'andrew');

    expect(links).toEqual([
      jasmine.objectContaining({
        label: 'andrew',
        route: '/user/area'
      }),
      jasmine.objectContaining({
        label: 'Account',
        route: '/user/account'
      })
    ]);
  });

  it('keeps guest links unchanged for the wide-shell header', () => {
    expect(buildWideShellAccountLinks(false, 'andrew')).toEqual(buildToolbarGuestLinks());
  });

  it('does not add the admin link to wide-shell links for guest or non-admin users', () => {
    const guestLinks = buildWideShellAccountLinks(false, 'Account', false);
    const nonAdminLinks = buildWideShellAccountLinks(true, 'andrew', false);

    expect(guestLinks.some(l => l.route === '/admin')).toBeFalse();
    expect(nonAdminLinks.some(l => l.route === '/admin')).toBeFalse();
  });

  it('adds the admin link to the wide-shell account group for admin users', () => {
    const links = buildWideShellAccountLinks(true, 'andrew', true);

    expect(links.some(l => l.route === '/admin')).toBeTrue();
  });

  it('getToolbarHomeLinks returns links including the home route', () => {
    const links = getToolbarHomeLinks();
    expect(links.length).toBeGreaterThan(0);
    expect(links.some(l => l.route === '/home')).toBeTrue();
  });

  it('getToolbarMainLinks returns prod links without dev-only items', () => {
    const prod = getToolbarMainLinks(false);
    const dev = getToolbarMainLinks(true);
    expect(prod.length).toBeGreaterThan(0);
    expect(prod.some(l => l.route === '/collections/browser')).toBeTrue();
    expect(prod.some(l => l.route === '/marketplace')).toBeTrue();
    expect(dev.length).toBeGreaterThanOrEqual(prod.length);
  });

  it('places Marketplace in the public browse group before Patches', () => {
    const routes = getToolbarMainLinks(false).map(link => link.route);

    expect(routes.indexOf('/marketplace')).toBeGreaterThan(routes.indexOf('/racks/browser'));
    expect(routes.indexOf('/marketplace')).toBeLessThan(routes.indexOf('/patches/browser'));
  });

  it('buildToolbarUserLinks includes My profile and account routes', () => {
    const links = buildToolbarUserLinks('alice');
    expect(links.some(l => l.route === '/user/area')).toBeTrue();
    expect(links.some(l => l.route === '/user/account')).toBeTrue();
    expect(links.some(l => l.label === 'alice')).toBeTrue();
  });

  it('buildToolbarUserLinks uses "Account" for blank/whitespace usernames', () => {
    const links = buildToolbarUserLinks('   ');
    expect(links.some(l => l.label === 'Account')).toBeTrue();
  });

  it('buildToolbarSections includes Browse and Account sections', () => {
    const sections = buildToolbarSections(true, 'bob', false, false);
    const labels = sections.map(s => s.label);
    expect(labels).not.toContain('Quick links');
    expect(labels).not.toContain('Support');
    expect(labels).toContain('Browse');
    expect(labels).toContain('Your account');
  });

  it('buildToolbarSections includes Admin section only for admin users', () => {
    const nonAdmin = buildToolbarSections(true, 'bob', false, false);
    const admin = buildToolbarSections(true, 'bob', true, false);
    expect(nonAdmin.some(s => s.label === 'Admin')).toBeFalse();
    expect(admin.some(s => s.label === 'Admin')).toBeTrue();
  });

  it('getWideShellQuickTargets returns combined home + main links', () => {
    const targets = getWideShellQuickTargets(false);
    const homeLinks = getToolbarHomeLinks();
    const mainLinks = getToolbarMainLinks(false);
    expect(targets.length).toBe(homeLinks.length + mainLinks.length);
  });
});
