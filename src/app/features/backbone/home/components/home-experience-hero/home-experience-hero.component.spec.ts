import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReplaySubject } from 'rxjs';
import { DETAIL_ANALYTICS_SURFACES } from 'src/app/components/detail-analytics-surface';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { PatchModule } from 'src/app/components/patch-parts/patch.module';
import { HomeExperienceHeroComponent } from './home-experience-hero.component';


describe('HomeExperienceHeroComponent', () => {
  let fixture: ComponentFixture<HomeExperienceHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeExperienceHeroComponent, RouterTestingModule],
      providers: [
        {
          provide: PatchDetailDataService,
          useValue: {
            updateSinglePatchData$: new ReplaySubject<number>(),
            setDetailAnalyticsSurface: jasmine.createSpy('setDetailAnalyticsSurface')
          }
        }
      ],
    })
      .overrideComponent(HomeExperienceHeroComponent, {
        remove: { imports: [PatchModule] },
        add: { schemas: [NO_ERRORS_SCHEMA] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(HomeExperienceHeroComponent);
    fixture.componentInstance.content = {
      eyebrow: 'Explore',
      title: 'Patch. Share. Discover.',
      subtitle: 'Make patches.\nBrowse racks.',
      mainVisual: {
        src: '/assets/screenshots/major-area-screenshots/04-patches.jpg',
        alt: 'Example hero visual',
        caption: 'Capture the patch and come back later.'
      }
    };
    fixture.detectChanges();
  });

  it('does not render shell toolbar chrome inside the home hero', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.title-metro-nav')).toBeNull();
    expect(host.querySelector('app-wide-shell-toolbar')).toBeNull();
  });

  it('subtitleLines splits content subtitle on newlines', () => {
    expect(fixture.componentInstance.subtitleLines).toEqual([
      'Make patches.',
      'Browse racks.'
    ]);
  });

  it('displays the eyebrow text in the template', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Explore');
  });

  it('renders the patch-graph shell in the hero visuals', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.patch-graph-shell')).not.toBeNull();
    expect(host.querySelector('.patch-graph-shell app-patch-graph')).not.toBeNull();
  });

  it('uses the home preview analytics surface while mounted', () => {
    const service = TestBed.inject(PatchDetailDataService);

    expect(service.setDetailAnalyticsSurface).toHaveBeenCalledWith(DETAIL_ANALYTICS_SURFACES.homePreview);

    fixture.destroy();

    expect(service.setDetailAnalyticsSurface).toHaveBeenCalledWith(DETAIL_ANALYTICS_SURFACES.detailRoute);
  });
});
