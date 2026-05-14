import { HomeWorkflowRailComponent } from './home-workflow-rail.component';

describe('HomeWorkflowRailComponent', () => {
  let comp: HomeWorkflowRailComponent;

  beforeEach(() => { comp = new HomeWorkflowRailComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('sectionTitle defaults to empty string', () => {
    expect(comp.sectionTitle).toBe('');
  });

  it('steps defaults to empty array', () => {
    expect(comp.steps).toEqual([]);
  });

  it('getStepDescriptionSegments returns empty for step with empty description', () => {
    const step = { kicker: 'k', title: 't', description: '', keywords: [] };
    expect(comp.getStepDescriptionSegments(step)).toEqual([]);
  });

  it('getStepDescriptionSegments returns segments for step with description', () => {
    const step = { kicker: 'k', title: 't', description: 'Hello world', keywords: ['world'] };
    const segments = comp.getStepDescriptionSegments(step);
    const highlighted = segments.filter(s => s.highlighted);
    expect(highlighted.length).toBe(1);
  });

  it('getStepDescriptionSegments with no matching keywords yields no highlights', () => {
    const step = { kicker: 'k', title: 't', description: 'Hello world', keywords: ['Missing'] };
    const segments = comp.getStepDescriptionSegments(step);
    expect(segments.every(s => !s.highlighted)).toBeTrue();
  });
});
