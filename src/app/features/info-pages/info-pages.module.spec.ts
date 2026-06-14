import { ChangelogComponent } from './changelog/changelog.component';
import { infoPageRoutes } from './info-pages.module';

describe('infoPageRoutes', () => {
  it('keeps changelog eager and application insights behind a lazy boundary', () => {
    expect(infoPageRoutes).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({
        path: 'changelog',
        component: ChangelogComponent
      }),
      jasmine.objectContaining({
        path: 'insights',
        loadChildren: jasmine.any(Function)
      })
    ]));
    expect(infoPageRoutes.find(route => route.path === 'insights')).not.toEqual(
      jasmine.objectContaining({component: jasmine.anything()})
    );
  });
});
