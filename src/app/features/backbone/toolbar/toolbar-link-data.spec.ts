import {
  buildWideShellAccountLinks,
  buildToolbarGuestLinks
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
});
