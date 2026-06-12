import { ModuleCollectionsBrowserDetailComponent } from './module-collections-browser-detail/module-collections-browser-detail.component';
import { ModuleCollectionsBrowserRootComponent } from './module-collections-browser-root/module-collections-browser-root.component';
import { moduleCollectionsPublicRoutes } from './module-collections.module';

describe('moduleCollectionsPublicRoutes', () => {
  it('keeps public browsing under /collections and redirects legacy manage URLs to the singular editor route', () => {
    expect(moduleCollectionsPublicRoutes).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({
        path: 'browser',
        component: ModuleCollectionsBrowserRootComponent
      }),
      jasmine.objectContaining({
        path: 'manage/:collectionId',
        pathMatch: 'full',
        redirectTo: '/collection/:collectionId'
      }),
      jasmine.objectContaining({
        path: ':publicId',
        component: ModuleCollectionsBrowserDetailComponent
      })
    ]));
  });

  it('does not capture numeric public IDs with an owned-editor matcher', () => {
    expect(moduleCollectionsPublicRoutes.some(route => 'matcher' in route)).toBeFalse();
  });
});
