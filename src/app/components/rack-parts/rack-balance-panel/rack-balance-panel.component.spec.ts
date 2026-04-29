import { RackBalancePanelComponent } from './rack-balance-panel.component';
import { RackBalanceAnalysisService } from '../rack-balance-analysis.service';


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
});
