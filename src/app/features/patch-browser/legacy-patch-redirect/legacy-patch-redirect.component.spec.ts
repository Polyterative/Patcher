import { of } from 'rxjs';
import { LegacyPatchRedirectComponent } from './legacy-patch-redirect.component';


describe('LegacyPatchRedirectComponent', () => {
  function build(id: string, data: string | null = 'tokenAbc') {
    const route = {params: of({id})};
    const router = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
    const backend = {
      GET: jasmine.createSpyObj('GET', {
        resolvePublicPatchLegacyId: of({data, error: null})
      })
    };
    const component = new LegacyPatchRedirectComponent(route as any, router, backend as any);
    return {component, router, backend};
  }

  it('redirects public legacy patch ids to the canonical token URL', () => {
    const {component, router, backend} = build('42', 'tokenAbc');

    component.ngOnInit();

    expect(backend.GET.resolvePublicPatchLegacyId).toHaveBeenCalledWith(42);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/patches/tokenAbc', {replaceUrl: true});
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('routes private or missing legacy patch ids to the retired-link page', () => {
    const {component, router, backend} = build('42', null);

    component.ngOnInit();

    expect(backend.GET.resolvePublicPatchLegacyId).toHaveBeenCalledWith(42);
    expect(router.navigate).toHaveBeenCalledWith(['/links/retired'], {replaceUrl: true});
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('ignores invalid legacy patch ids', () => {
    const {component, router, backend} = build('not-a-number');

    component.ngOnInit();

    expect(backend.GET.resolvePublicPatchLegacyId).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
