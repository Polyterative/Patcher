import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { DETAIL_ANALYTICS_SURFACES } from 'src/app/components/detail-analytics-surface';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { PatchModule } from 'src/app/components/patch-parts/patch.module';
import { PatchConnection } from 'src/app/models/connection';
import { Patch } from 'src/app/models/patch';
import { HOME_HERO } from '../../home-copy';
import { HomeCtaClick } from '../../home-content.models';
import { buildHeroPatchMeta, HomeExperienceHeroComponent } from './home-experience-hero.component';

function connection(aId: number, bId: number, instanceA?: number, instanceB?: number): PatchConnection {
  return {
    patch: {id: 5},
    a: {id: aId * 10, name: 'out', module: {id: aId} as PatchConnection['a']['module']},
    b: {id: bId * 10, name: 'in', module: {id: bId} as PatchConnection['b']['module']},
    instance_id_a: instanceA,
    instance_id_b: instanceB
  };
}

describe('buildHeroPatchMeta', () => {
  it('returns null until both a name and connections are present', () => {
    expect(buildHeroPatchMeta(undefined, [connection(1, 2)])).toBeNull();
    expect(buildHeroPatchMeta('Demo', null)).toBeNull();
    expect(buildHeroPatchMeta('Demo', [])).toBeNull();
  });

  it('counts cables and distinct module instances', () => {
    const meta = buildHeroPatchMeta('Demo', [
      connection(1, 2),
      connection(2, 3),
      connection(3, 3, 7, 8)
    ]);
    // modules 1, 2, 3 (no instance), 3#7 and 3#8 are separate physical copies
    expect(meta).toEqual({name: 'Demo', modules: 5, cables: 3});
  });
});

describe('HomeExperienceHeroComponent', () => {
  let fixture: ComponentFixture<HomeExperienceHeroComponent>;
  let patch$: BehaviorSubject<Patch | undefined>;
  let connections$: BehaviorSubject<PatchConnection[] | null>;

  beforeEach(async () => {
    patch$ = new BehaviorSubject<Patch | undefined>(undefined);
    connections$ = new BehaviorSubject<PatchConnection[] | null>(null);

    await TestBed.configureTestingModule({
      imports: [HomeExperienceHeroComponent],
      providers: [
        provideRouter([]),
        {
          provide: PatchDetailDataService,
          useValue: {
            updateSinglePatchData$: new ReplaySubject<number>(),
            singlePatchData$: patch$,
            patchConnections$: connections$,
            setDetailAnalyticsSurface: jasmine.createSpy('setDetailAnalyticsSurface')
          }
        }
      ],
    })
      .overrideComponent(HomeExperienceHeroComponent, {
        remove: {imports: [PatchModule]},
        add: {schemas: [NO_ERRORS_SCHEMA]}
      })
      .compileComponents();

    fixture = TestBed.createComponent(HomeExperienceHeroComponent);
    fixture.componentInstance.content = HOME_HERO;
    fixture.detectChanges();
  });

  it('renders the headline as the page h1', () => {
    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(h1?.textContent).toContain('Your operating system for everything modular.');
  });

  it('offers sign-up to visitors and the workspace to signed-in users', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('a[href="/auth/signup"]')).not.toBeNull();
    expect(host.querySelector('a[href="/user/area"]')).toBeNull();

    fixture.componentRef.setInput('isSignedIn', true);
    fixture.detectChanges();

    expect(host.querySelector('a[href="/auth/signup"]')).toBeNull();
    expect(host.querySelector('a[href="/user/area"]')).not.toBeNull();
  });

  it('keeps the live patch graph in the hero panel', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.hero__graph app-patch-graph')).not.toBeNull();
  });

  it('shows patch name and counts once the patch loads', () => {
    patch$.next({id: 5, name: 'Demo Patch'} as Patch);
    connections$.next([connection(1, 2), connection(2, 3)]);
    fixture.detectChanges();

    const bar = (fixture.nativeElement as HTMLElement).querySelector('.hero__panel-bar')?.textContent ?? '';
    expect(bar).toContain('Demo Patch');
    expect(bar).toContain('3 modules');
    expect(bar).toContain('2 cables');
  });

  it('emits a tracked click and a scroll request from the ModularGrid hook', () => {
    const clicks: HomeCtaClick[] = [];
    let switchRequests = 0;
    fixture.componentInstance.ctaClicked.subscribe(click => clicks.push(click));
    fixture.componentInstance.switchRequested.subscribe(() => switchRequests++);

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.hero__switch-link');
    link?.click();

    expect(clicks).toEqual([{cta: 'switch_anchor', location: 'hero'}]);
    expect(switchRequests).toBe(1);
  });

  it('uses the home preview analytics surface while mounted', () => {
    const service = TestBed.inject(PatchDetailDataService);

    expect(service.setDetailAnalyticsSurface).toHaveBeenCalledWith(DETAIL_ANALYTICS_SURFACES.homePreview);

    fixture.destroy();

    expect(service.setDetailAnalyticsSurface).toHaveBeenCalledWith(DETAIL_ANALYTICS_SURFACES.detailRoute);
  });
});
