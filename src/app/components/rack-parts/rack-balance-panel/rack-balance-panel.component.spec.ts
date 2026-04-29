import { RackBalancePanelComponent } from './rack-balance-panel.component';
import { RackBalanceAnalysisService } from '../rack-balance-analysis.service';
import { RackBalanceAnalysisResult } from '../rack-balance-analysis.service';


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
});
