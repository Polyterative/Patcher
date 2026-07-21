import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { of } from 'rxjs';
import { SupabaseService } from '../../backend/supabase.service';
import { LegacyPatchRedirectComponent } from './legacy-patch-redirect.component';


describe('LegacyPatchRedirectComponent', () => {
  type LegacyRouteDouble = Pick<ActivatedRoute, 'params'>;
  type RouterDouble = Pick<Router, 'navigate' | 'navigateByUrl'>;
  type ResolvePublicPatchLegacyId = (id: number) => ReturnType<SupabaseService['GET']['resolvePublicPatchLegacyId']>;
  interface BackendDouble {
    GET: {
      resolvePublicPatchLegacyId: jasmine.Spy<ResolvePublicPatchLegacyId>;
    };
  }

  function build(id: string, data: string | null = 'tokenAbc') {
    const route = {params: of({id})} satisfies LegacyRouteDouble;
    const router = jasmine.createSpyObj<RouterDouble>('Router', ['navigate', 'navigateByUrl']);
    const backend = {
      GET: {
        resolvePublicPatchLegacyId: jasmine.createSpy<ResolvePublicPatchLegacyId>('GET.resolvePublicPatchLegacyId')
          .and.returnValue(of({data, error: null}))
      }
    } satisfies BackendDouble;
    TestBed.configureTestingModule({
      providers: [
        {provide: ActivatedRoute, useValue: route},
        {provide: Router, useValue: router},
        {provide: SupabaseService, useValue: backend}
      ]
    });
    const component = new LegacyPatchRedirectComponent(
      TestBed.inject(ActivatedRoute),
      TestBed.inject(Router),
      TestBed.inject(SupabaseService)
    );
    return {component, router, backend};
  }

  it('redirects public legacy patch ids to the canonical token URL with replaceUrl', () => {
    const {component, router, backend} = build('42', 'tokenAbc');

    component.ngOnInit();

    expect(backend.GET.resolvePublicPatchLegacyId).toHaveBeenCalledWith(42);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/patches/tokenAbc', {replaceUrl: true});
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('routes private or missing legacy patch ids to the retired-link page with replaceUrl', () => {
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
