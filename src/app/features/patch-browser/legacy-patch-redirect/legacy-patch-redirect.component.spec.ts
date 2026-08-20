import { PLATFORM_ID, ResponseInit } from '@angular/core';
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

  function build(
    id: string,
    data: string | null = 'tokenAbc',
    platform: 'browser' | 'server' = 'browser',
    responseInit: ResponseInit | null = null
  ) {
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
        {provide: SupabaseService, useValue: backend},
        {provide: PLATFORM_ID, useValue: platform}
      ]
    });
    const component = new LegacyPatchRedirectComponent(
      TestBed.inject(ActivatedRoute),
      TestBed.inject(Router),
      TestBed.inject(SupabaseService),
      TestBed.inject(PLATFORM_ID),
      responseInit
    );
    return {component, router, backend};
  }

  it('redirects public legacy patch ids to the canonical token URL with replaceUrl in the browser', () => {
    const {component, router, backend} = build('42', 'tokenAbc');

    component.ngOnInit();

    expect(backend.GET.resolvePublicPatchLegacyId).toHaveBeenCalledWith(42);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/patches/tokenAbc', {replaceUrl: true});
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('routes private or missing legacy patch ids to the retired-link page with replaceUrl in the browser', () => {
    const {component, router, backend} = build('42', null);

    component.ngOnInit();

    expect(backend.GET.resolvePublicPatchLegacyId).toHaveBeenCalledWith(42);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/links/retired', {replaceUrl: true});
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ignores invalid legacy patch ids', () => {
    const {component, router, backend} = build('not-a-number');

    component.ngOnInit();

    expect(backend.GET.resolvePublicPatchLegacyId).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('issues a real 301 HTTP redirect (no Router navigation) for public legacy patch ids during SSR', () => {
    const responseInit: ResponseInit = {};
    const {component, router, backend} = build('42', 'tokenAbc', 'server', responseInit);

    component.ngOnInit();

    expect(backend.GET.resolvePublicPatchLegacyId).toHaveBeenCalledWith(42);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(responseInit.status).toBe(301);
    expect((responseInit.headers as Headers).get('Location')).toBe('/patches/tokenAbc');
  });

  it('issues a real 302 HTTP redirect to the retired-link page during SSR for private/missing legacy patch ids', () => {
    const responseInit: ResponseInit = {};
    const {component, router, backend} = build('42', null, 'server', responseInit);

    component.ngOnInit();

    expect(backend.GET.resolvePublicPatchLegacyId).toHaveBeenCalledWith(42);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(responseInit.status).toBe(302);
    expect((responseInit.headers as Headers).get('Location')).toBe('/links/retired');
  });

  it('does nothing (no throw) during SSR when RESPONSE_INIT is unavailable', () => {
    const {component, router} = build('42', 'tokenAbc', 'server', null);

    expect(() => component.ngOnInit()).not.toThrow();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
