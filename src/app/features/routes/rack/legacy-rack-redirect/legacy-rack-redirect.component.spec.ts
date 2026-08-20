import { PLATFORM_ID, ResponseInit } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { of } from 'rxjs';
import { SupabaseService } from '../../../backend/supabase.service';
import { LegacyRackRedirectComponent } from './legacy-rack-redirect.component';


describe('LegacyRackRedirectComponent', () => {
  type LegacyRouteDouble = Pick<ActivatedRoute, 'params'>;
  type RouterDouble = Pick<Router, 'navigate' | 'navigateByUrl'>;
  type ResolvePublicRackLegacyId = (id: number) => ReturnType<SupabaseService['GET']['resolvePublicRackLegacyId']>;
  interface BackendDouble {
    GET: {
      resolvePublicRackLegacyId: jasmine.Spy<ResolvePublicRackLegacyId>;
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
        resolvePublicRackLegacyId: jasmine.createSpy<ResolvePublicRackLegacyId>('GET.resolvePublicRackLegacyId')
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
    const component = new LegacyRackRedirectComponent(
      TestBed.inject(ActivatedRoute),
      TestBed.inject(Router),
      TestBed.inject(SupabaseService),
      TestBed.inject(PLATFORM_ID),
      responseInit
    );
    return {component, router, backend};
  }

  it('redirects public legacy rack ids to the canonical token URL with replaceUrl in the browser', () => {
    const {component, router, backend} = build('42', 'tokenAbc');

    component.ngOnInit();

    expect(backend.GET.resolvePublicRackLegacyId).toHaveBeenCalledWith(42);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/racks/tokenAbc', {replaceUrl: true});
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('routes private or missing legacy rack ids to the retired-link page with replaceUrl in the browser', () => {
    const {component, router, backend} = build('42', null);

    component.ngOnInit();

    expect(backend.GET.resolvePublicRackLegacyId).toHaveBeenCalledWith(42);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/links/retired', {replaceUrl: true});
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ignores invalid legacy rack ids', () => {
    const {component, router, backend} = build('not-a-number');

    component.ngOnInit();

    expect(backend.GET.resolvePublicRackLegacyId).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('issues a real 301 HTTP redirect (no Router navigation) for public legacy rack ids during SSR', () => {
    const responseInit: ResponseInit = {};
    const {component, router, backend} = build('42', 'tokenAbc', 'server', responseInit);

    component.ngOnInit();

    expect(backend.GET.resolvePublicRackLegacyId).toHaveBeenCalledWith(42);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(responseInit.status).toBe(301);
    expect((responseInit.headers as Headers).get('Location')).toBe('/racks/tokenAbc');
  });

  it('issues a real 302 HTTP redirect to the retired-link page during SSR for private/missing legacy rack ids', () => {
    const responseInit: ResponseInit = {};
    const {component, router, backend} = build('42', null, 'server', responseInit);

    component.ngOnInit();

    expect(backend.GET.resolvePublicRackLegacyId).toHaveBeenCalledWith(42);
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
