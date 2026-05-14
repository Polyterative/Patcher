import { RackBalancePanelComponent } from './rack-balance-panel.component';
import { RackBalanceAnalysisResult, RackBalanceAnalysisService } from '../rack-balance-analysis.service';


describe('RackBalancePanelComponent', () => {
  function build() {
    const analysisService = jasmine.createSpyObj<RackBalanceAnalysisService>('RackBalanceAnalysisService', ['analyze']);
    const component = new RackBalancePanelComponent(analysisService);

    return {component, analysisService};
  }

  it('starts collapsed by default', () => {
    const {component} = build();

    expect(component.isExpanded).toBeFalse();
  });

  it('toggles expanded state on demand', () => {
    const {component} = build();

    component.toggleExpanded();
    expect(component.isExpanded).toBeTrue();

    component.toggleExpanded();
    expect(component.isExpanded).toBeFalse();
  });

  it('returns only the strongest matched axes for the compact summary', () => {
    const {component} = build();

    const highlights = component.compactHighlights({
      axes: [
        {id: 'voices', label: 'Voices', icon: 'graphic_eq', share: 18, matchedModules: 2, guidance: ''},
        {id: 'modulation', label: 'Modulation', icon: 'swap_calls', share: 34, matchedModules: 4, guidance: ''},
        {id: 'utilities', label: 'Utilities', icon: 'build', share: 0, matchedModules: 0, guidance: ''},
        {id: 'timing', label: 'Timing', icon: 'timer', share: 22, matchedModules: 3, guidance: ''},
        {id: 'tone', label: 'Tone shaping', icon: 'tune', share: 8, matchedModules: 1, guidance: ''},
      ],
      confidence: 0.7,
      recognizedModuleCount: 7,
      totalModules: 10,
      warningMessage: null,
      summary: 'Summary',
      isEmpty: false
    });

    expect(highlights.map(axis => axis.id)).toEqual(['modulation', 'timing']);
  });

  it('builds five radar axes and a polygon string for the chart view', () => {
    const {component} = build();
    const analysis: RackBalanceAnalysisResult = {
      axes: [
        {id: 'voices', label: 'Voices', icon: 'graphic_eq', share: 18, matchedModules: 2, guidance: ''},
        {id: 'modulation', label: 'Modulation', icon: 'swap_calls', share: 34, matchedModules: 4, guidance: ''},
        {id: 'utilities', label: 'Utilities', icon: 'build', share: 12, matchedModules: 2, guidance: ''},
        {id: 'timing', label: 'Timing', icon: 'timer', share: 22, matchedModules: 3, guidance: ''},
        {id: 'tone', label: 'Tone shaping', icon: 'tune', share: 14, matchedModules: 2, guidance: ''},
      ],
      confidence: 0.7,
      recognizedModuleCount: 7,
      totalModules: 10,
      warningMessage: null,
      summary: 'Summary',
      isEmpty: false
    };

    const radarAxes = component.radarAxes(analysis);

    expect(radarAxes.length).toBe(5);
    expect(radarAxes.find(axis => axis.axis.id === 'tone')?.shortLabel).toBe('Tone');
    expect(component.radarPolygonPoints(analysis).split(' ').length).toBe(5);
    expect(component.strongestAxis(analysis).id).toBe('modulation');
    expect(component.weakestAxis(analysis).id).toBe('utilities');
    const strongestPoint = radarAxes.find(axis => axis.axis.id === 'modulation')!.point;
    const strongestDistance = Math.hypot(
      strongestPoint.x - component.radarCenter,
      strongestPoint.y - component.radarCenter
    );
    expect(strongestDistance).toBeCloseTo(component.radarRadius, 4);
  });

  it('keeps details open and ignores toggles when always expanded', () => {
    const {component} = build();

    component.alwaysExpanded = true;

    expect(component.isDetailsOpen()).toBeTrue();

    component.toggleExpanded();

    expect(component.isExpanded).toBeFalse();
    expect(component.isDetailsOpen()).toBeTrue();
  });

  it('treats partial coverage as not reliable enough for the detailed radar view', () => {
    const {component} = build();

    expect(component.hasReliableAnalysis({
      axes: [],
      confidence: 0.25,
      recognizedModuleCount: 1,
      totalModules: 4,
      warningMessage: 'Guidance is partial',
      summary: 'Summary',
      isEmpty: false
    })).toBeFalse();
  });

  it('builds a low-data explanation for partial tag coverage', () => {
    const {component} = build();

    const analysis: RackBalanceAnalysisResult = {
      axes: [],
      confidence: 0.25,
      recognizedModuleCount: 1,
      totalModules: 4,
      warningMessage: 'Guidance is partial',
      summary: 'Summary',
      isEmpty: false
    };

    expect(component.lowDataTitle(analysis)).toContain('hidden');
    expect(component.lowDataMessage(analysis)).toContain('1 of 4 modules');
  });

  it('returns an empty rack title and message when isEmpty is true', () => {
    const {component} = build();
    const analysis: RackBalanceAnalysisResult = {
      axes: [], confidence: 0, recognizedModuleCount: 0, totalModules: 0,
      warningMessage: null, summary: '', isEmpty: true
    };
    expect(component.lowDataTitle(analysis)).toContain('modules to evaluate');
    expect(component.lowDataMessage(analysis)).toContain('Add modules');
  });

  it('confidencePercent rounds to the nearest integer percentage', () => {
    const {component} = build();
    const makeAnalysis = (c: number): RackBalanceAnalysisResult => ({
      axes: [], confidence: c, recognizedModuleCount: 0, totalModules: 0,
      warningMessage: null, summary: '', isEmpty: false
    });
    expect(component.confidencePercent(makeAnalysis(0.756))).toBe(76);
    expect(component.confidencePercent(makeAnalysis(1))).toBe(100);
  });

  it('axisDetails excludes axes with zero matched modules', () => {
    const {component} = build();
    const analysis: RackBalanceAnalysisResult = {
      axes: [
        {id: 'voices', label: 'Voices', icon: 'graphic_eq', share: 30, matchedModules: 3, guidance: ''},
        {id: 'utilities', label: 'Utilities', icon: 'build', share: 0, matchedModules: 0, guidance: ''},
      ],
      confidence: 0.8, recognizedModuleCount: 3, totalModules: 5, warningMessage: null, summary: '', isEmpty: false
    };
    const details = component.axisDetails(analysis);
    expect(details.length).toBe(1);
    expect(details[0].id).toBe('voices');
  });

  it('radarShowcaseStats labels the strongest axis as Leans toward', () => {
    const {component} = build();
    const analysis: RackBalanceAnalysisResult = {
      axes: [
        {id: 'voices', label: 'Voices', icon: 'graphic_eq', share: 60, matchedModules: 4, guidance: ''},
        {id: 'timing', label: 'Timing', icon: 'timer', share: 20, matchedModules: 2, guidance: ''},
      ],
      confidence: 0.9, recognizedModuleCount: 6, totalModules: 8, warningMessage: null, summary: '', isEmpty: false
    };
    const stats = component.radarShowcaseStats(analysis);
    expect(stats[0].label).toBe('Leans toward');
    expect(stats[0].value).toBe('Voices');
    expect(stats[1].label).toBe('Light on');
    expect(stats[1].value).toBe('Timing');
  });

  it('infoTooltip always contains advisory disclaimer', () => {
    const {component} = build();
    const analysis: RackBalanceAnalysisResult = {
      axes: [], confidence: 0.8, recognizedModuleCount: 5, totalModules: 8,
      warningMessage: null, summary: '', isEmpty: false
    };
    const tooltip = component.infoTooltip(analysis);
    expect(tooltip).toContain('Advisory only');
    expect(tooltip).toContain('5 tagged modules');
  });

  it('radarGridPoints returns a polygon string with 5 coordinates', () => {
    const {component} = build();
    const points = component.radarGridPoints(0.5);
    expect(points.trim().split(' ').length).toBe(5);
  });
});
