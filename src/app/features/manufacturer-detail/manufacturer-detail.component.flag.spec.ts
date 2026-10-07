import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { TimeagoPipe } from 'ngx-timeago';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { ModuleList } from 'src/app/features/module-browser/module-browser-data.service';
import { MinimalModule } from 'src/app/models/module';
import featureFlags from 'src/environments/features.json';
import { ManufacturerDetailComponent } from './manufacturer-detail.component';
import {
  ManufacturerDetail,
  ManufacturerDetailDataService
} from './manufacturer-detail-data.service';


const UNRELEASED_SECTION_LABELS = ['Featured modules', 'Aggregate activity', 'Widget embed preview'];

function makeModule(id: number): MinimalModule {
  return {
    id,
    name: `Module ${ id }`,
    description: '',
    hp: 8,
    public: true,
    manufacturer: {id: 1, name: 'Malstrom'},
    manufacturerId: 1,
    standard: {id: 0, name: '3U'},
    tags: [],
    panels: [],
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
  };
}

function render(manufacturerInsightsEnabled: boolean): ComponentFixture<ManufacturerDetailComponent> {
  const manufacturer: ManufacturerDetail = {
    id: 1,
    name: 'Malstrom',
    logo: null,
    websiteURL: null,
    changedModulesLast30Days: 0,
    latestModuleUpdatedAt: null,
  };
  const dataService = {
    logoStorageBase: 'https://cdn.example.test/',
    manufacturerData$: new BehaviorSubject<ManufacturerDetail | null>(manufacturer),
    modulesData$: new BehaviorSubject<ModuleList>([makeModule(10), makeModule(11)]),
    displayAggregateRows$: new BehaviorSubject<unknown>([]),
    isLoading$: new BehaviorSubject(false),
    updateManufacturer$: new Subject<number>(),
  };

  TestBed.configureTestingModule({
    declarations: [ManufacturerDetailComponent],
    providers: [
      {provide: ActivatedRoute, useValue: {params: new Subject()}},
      {provide: SeoAndUtilsService, useValue: {updateSeo: jasmine.createSpy('updateSeo')}},
      {provide: TimeagoPipe, useValue: {transform: () => ''}},
      {provide: UrlCreatorService, useValue: {copyTextToClipboard: jasmine.createSpy('copy')}},
    ],
    schemas: [NO_ERRORS_SCHEMA],
  }).overrideComponent(ManufacturerDetailComponent, {
    set: {providers: [{provide: ManufacturerDetailDataService, useValue: dataService}]}
  });

  const fixture = TestBed.createComponent(ManufacturerDetailComponent);
  fixture.componentInstance.manufacturerInsightsEnabled = manufacturerInsightsEnabled;
  fixture.detectChanges();
  return fixture;
}

function sectionLabels(fixture: ComponentFixture<ManufacturerDetailComponent>): string[] {
  const host: HTMLElement = fixture.nativeElement;
  return Array.from(host.querySelectorAll('section[aria-label]'))
    .map(section => section.getAttribute('aria-label') ?? '');
}

describe('ManufacturerDetailComponent manufacturerInsightsEnabled flag', () => {

  afterEach(() => TestBed.resetTestingModule());

  // Regression: unreleased Featured / Activity / Widget preview sections were
  // visible on production manufacturer pages.
  it('keeps the flag off in the production feature block', () => {
    expect(featureFlags.production.manufacturerInsightsEnabled).toBeFalse();
    expect(featureFlags.development.manufacturerInsightsEnabled).toBeTrue();
  });

  it('hides Featured, Activity and Widget preview when the flag is off', () => {
    const fixture = render(false);

    expect(sectionLabels(fixture)).toEqual([]);
    expect(fixture.nativeElement.querySelector('app-lib-showcase-grid')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-module-list')).not.toBeNull();
  });

  it('shows Featured, Activity and Widget preview when the flag is on', () => {
    const fixture = render(true);

    expect(sectionLabels(fixture)).toEqual(UNRELEASED_SECTION_LABELS);
    expect(fixture.nativeElement.querySelector('app-module-list')).not.toBeNull();
  });
});
