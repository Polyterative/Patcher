import { AuthGuard } from '../backbone/login/user-auth-guard.service';
import { ModuleCollectionsOwnedDetailComponent } from './module-collections-owned-detail/module-collections-owned-detail.component';
import { moduleCollectionsOwnedRoutes } from './module-collections-owned.module';

describe('moduleCollectionsOwnedRoutes', () => {
  it('uses the lazy module root as the authenticated singular editor page', () => {
    expect(moduleCollectionsOwnedRoutes).toEqual([
      jasmine.objectContaining({
        path: '',
        component: ModuleCollectionsOwnedDetailComponent,
        canActivate: [AuthGuard]
      })
    ]);
  });
});
