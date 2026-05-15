import { of } from 'rxjs';
import { LegacyRackRedirectComponent } from './legacy-rack-redirect.component';


describe('LegacyRackRedirectComponent', () => {
  function build(id: string, data: string | null = 'tokenAbc') {
    const route = {params: of({id})};
    const router = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
    const backend = {
      GET: jasmine.createSpyObj('GET', {
        resolvePublicRackLegacyId: of({data, error: null})
      })
    };
    const component = new LegacyRackRedirectComponent(route as any, router, backend as any);
    return {component, router, backend};
  }

  it('redirects public legacy rack ids to the canonical token URL with replaceUrl', () => {
    const {component, router, backend} = build('42', 'tokenAbc');

    component.ngOnInit();

    expect(backend.GET.resolvePublicRackLegacyId).toHaveBeenCalledWith(42);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/racks/tokenAbc', {replaceUrl: true});
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('routes private or missing legacy rack ids to the retired-link page with replaceUrl', () => {
    const {component, router, backend} = build('42', null);

    component.ngOnInit();

    expect(backend.GET.resolvePublicRackLegacyId).toHaveBeenCalledWith(42);
    expect(router.navigate).toHaveBeenCalledWith(['/links/retired'], {replaceUrl: true});
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('ignores invalid legacy rack ids', () => {
    const {component, router, backend} = build('not-a-number');

    component.ngOnInit();

    expect(backend.GET.resolvePublicRackLegacyId).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
