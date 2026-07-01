import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';
import { By } from '@angular/platform-browser';
import { defaultModuleMinimalViewConfig } from '../module-minimal.component';
import { DescriptionKeywordHighlightPipe } from '../../shared-pipes/description-keyword-highlight.pipe';
import {
  ModuleDescriptionAnalysisSuiteComponent
} from '../../module-description-analysis/suite/module-description-analysis-suite.component';
import { ModulePartDescriptionComponent } from './module-part-description.component';
import { MinimalModule } from 'src/app/models/module';

describe('ModulePartDescriptionComponent', () => {
  let comp: ModulePartDescriptionComponent;
  let fixture: ComponentFixture<ModulePartDescriptionComponent>;
  const description = 'A long module description that should be clamped by rendered lines instead of character count.';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ModulePartDescriptionComponent,
        DescriptionKeywordHighlightPipe
      ],
      imports: [
        ModuleDescriptionAnalysisSuiteComponent,
        MatCardModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ModulePartDescriptionComponent);
    comp = fixture.componentInstance;
    comp.data = {id: 1, name: 'VCO', description} as any;
    comp.viewConfig = {...defaultModuleMinimalViewConfig};
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('data input can be assigned', () => {
    comp.data = {id: 1, name: 'VCO', description: 'A voltage controlled oscillator'} as any;
    expect(comp.data.name).toBe('VCO');
  });

  it('viewConfig input can be assigned', () => {
    const cfg = {showDescription: true} as any;
    comp.viewConfig = cfg;
    expect(comp.viewConfig).toBe(cfg);
  });

  it('clamps description after rendered line overflow is measured', () => {
    comp.viewConfig = {
      ...defaultModuleMinimalViewConfig,
      ellipseDescription: true
    };
    comp.shouldClampDescription = true;

    fixture.detectChanges();

    const subtitle = fixture.nativeElement.querySelector('mat-card-subtitle') as HTMLElement;
    const reader = fixture.nativeElement.querySelector('.module-description-reader') as HTMLElement;

    expect(subtitle.textContent?.trim()).toBe(description);
    expect(subtitle.classList).toContain('module-description--clamped');
    expect(subtitle.getAttribute('title')).toBeNull();
    expect(subtitle.getAttribute('tabindex')).toBe('0');
    expect(reader.textContent?.trim()).toBe(description);
    expect(reader.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the full description without reader affordance when unclamped', () => {
    comp.viewConfig = {
      ...defaultModuleMinimalViewConfig,
      ellipseDescription: false
    };

    fixture.detectChanges();

    const subtitle = fixture.nativeElement.querySelector('mat-card-subtitle') as HTMLElement;
    const reader = fixture.nativeElement.querySelector('.module-description-reader');

    expect(subtitle.textContent?.trim()).toBe(description);
    expect(subtitle.classList).not.toContain('module-description--clamped');
    expect(subtitle.getAttribute('title')).toBeNull();
    expect(subtitle.getAttribute('tabindex')).toBeNull();
    expect(reader).toBeNull();
    expect(reader).toBeNull();
  });

  it('renders keyword highlight spans only when the view config opts in', () => {
    comp.data = {
      id: 1,
      name: 'Scanner',
      description: 'Dual VCO with filter routing'
    } as MinimalModule;
    comp.viewConfig = {
      ...defaultModuleMinimalViewConfig,
      highlightDescriptionKeywords: true
    };

    fixture.detectChanges();

    const subtitle = fixture.nativeElement.querySelector('mat-card-subtitle') as HTMLElement;
    expect(subtitle.querySelectorAll('.desc-kw').length).toBe(2);
    expect(subtitle.querySelector('.desc-kw--voices')?.textContent).toBe('VCO');
  });

  it('renders the description analysis suite only when the view config opts in', () => {
    comp.data = {
      id: 1,
      name: 'EQ',
      description: 'The high band offers boost between 5kHz and 20kHz.'
    } as MinimalModule;
    comp.viewConfig = {
      ...defaultModuleMinimalViewConfig,
      showFrequencyAnalysis: false
    };

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-module-description-analysis-suite')).toBeNull();

    const optInFixture = TestBed.createComponent(ModulePartDescriptionComponent);
    optInFixture.componentInstance.data = comp.data;
    optInFixture.componentInstance.viewConfig = {
      ...defaultModuleMinimalViewConfig,
      showFrequencyAnalysis: true
    };
    optInFixture.detectChanges();
    expect(optInFixture.nativeElement.querySelector('app-module-description-analysis-suite')).toBeTruthy();
    const suiteDebugElement = optInFixture.debugElement.query(By.directive(ModuleDescriptionAnalysisSuiteComponent));
    const suite = suiteDebugElement.componentInstance as ModuleDescriptionAnalysisSuiteComponent;

    expect(suiteDebugElement).toBeTruthy();
    expect(suite.showFrequencyAnalysis).toBeTrue();
    expect(suite.showDescriptionAnalysis).toBeFalse();
  });

  it('keeps short descriptions unclamped when they occupy five lines or fewer', () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollHeight', {value: 70});
    spyOn(window, 'getComputedStyle').and.returnValue({
      fontSize: '14px', // px-ok: mirrors browser-computed CSSStyleDeclaration values
      lineHeight: '14px' // px-ok: mirrors browser-computed CSSStyleDeclaration values
    } as CSSStyleDeclaration);

    expect(comp.descriptionExceedsLineLimit(element)).toBeFalse();
  });

  it('detects descriptions that overflow five rendered lines', () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollHeight', {value: 86});
    spyOn(window, 'getComputedStyle').and.returnValue({
      fontSize: '14px', // px-ok: mirrors browser-computed CSSStyleDeclaration values
      lineHeight: '14px' // px-ok: mirrors browser-computed CSSStyleDeclaration values
    } as CSSStyleDeclaration);

    expect(comp.descriptionExceedsLineLimit(element)).toBeTrue();
  });

  it('does not clamp measured overflow when description ellipsis is disabled', () => {
    const element = document.createElement('div');
    comp.shouldClampDescription = true;
    comp.viewConfig = {
      ...defaultModuleMinimalViewConfig,
      ellipseDescription: false
    };

    comp.updateClampState(element);

    expect(comp.shouldClampDescription).toBeFalse();
  });

  it('aligns the reader inward when there is not enough right-side viewport space', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(1200);
    comp.updateReaderAlignment({
      getBoundingClientRect: () => ({left: 900}) as DOMRect
    } as HTMLElement);

    expect(comp.readerAlignEnd).toBeTrue();
  });

  it('keeps the reader left-aligned when it fits in the viewport', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(1200);
    comp.readerAlignEnd = true;

    comp.updateReaderAlignment({
      getBoundingClientRect: () => ({left: 200}) as DOMRect
    } as HTMLElement);

    expect(comp.readerAlignEnd).toBeFalse();
  });
});
