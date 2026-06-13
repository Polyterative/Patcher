import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { HeroContentCardComponent } from './hero-content-card.component';
import { shouldCompactHeroTitleSub } from './hero-title-layout.utils';


describe('HeroContentCardComponent', () => {
  let fixture: ComponentFixture<HeroContentCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        RouterTestingModule,
        HeroContentCardComponent
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(HeroContentCardComponent);
    fixture.componentInstance.titleBig = 'Modules';
    fixture.componentInstance.description = 'Browse the latest additions to the catalog.';
    fixture.detectChanges();
  });

  it('does not render shell toolbar chrome inside the card', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.title-metro-nav')).toBeNull();
    expect(host.querySelector('app-wide-shell-toolbar')).toBeNull();
  });

  it('stacks the inline description under the title block when titleSub is present', () => {
    fixture.componentRef.setInput('titleSub', 'Polyterative');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.title-heading-copy--stacked-description')).not.toBeNull();
  });

  it('renders titleNormal when set', () => {
    fixture.componentRef.setInput('titleBig', undefined);
    fixture.componentRef.setInput('titleNormal', 'Browse the catalog');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Browse the catalog');
  });

  it('keeps titleSub inline by default', () => {
    fixture.componentRef.setInput('titleSub', 'very-long-profile-name-that-can-wrap');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.title-text--with-sub-compact')).toBeNull();
  });

  it('compacts titleSub when compactTitleSub is enabled', () => {
    fixture.componentRef.setInput('titleSub', 'Polyterative');
    fixture.componentRef.setInput('compactTitleSub', true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.title-text--with-sub-compact')).not.toBeNull();
  });

  it('auto-compacts titleSub only when the sub title is long', () => {
    fixture.componentRef.setInput('titleSub', 'Polyterative');
    fixture.componentRef.setInput('autoCompactTitleSub', true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.title-text--with-sub-auto')).not.toBeNull();
    expect(host.querySelector('.title-text--with-sub-compact')).toBeNull();

    fixture.componentRef.setInput('titleSub', 'very-long-profile-name-that-can-wrap');
    fixture.detectChanges();

    expect(host.querySelector('.title-text--with-sub-compact')).not.toBeNull();
  });
});

describe('shouldCompactHeroTitleSub', () => {
  it('returns false for missing or short subtitles', () => {
    expect(shouldCompactHeroTitleSub(undefined)).toBeFalse();
    expect(shouldCompactHeroTitleSub('Polyterative')).toBeFalse();
  });

  it('returns true when the subtitle exceeds the compact threshold', () => {
    expect(shouldCompactHeroTitleSub('123456', { compactAtLength: 5 })).toBeTrue();
  });
});
