import { HomeProofShowcaseComponent } from './home-proof-showcase.component';

describe('HomeProofShowcaseComponent', () => {
  let comp: HomeProofShowcaseComponent;

  beforeEach(() => {
    comp = new HomeProofShowcaseComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('kicker defaults to empty string', () => {
    expect(comp.kicker).toBe('');
  });

  it('title defaults to empty string', () => {
    expect(comp.title).toBe('');
  });

  it('tone defaults to "patch"', () => {
    expect(comp.tone).toBe('patch');
  });

  it('reverse defaults to false', () => {
    expect(comp.reverse).toBeFalse();
  });

  it('getDescriptionSegments returns empty array when description is empty', () => {
    comp.description = '';
    expect(comp.getDescriptionSegments()).toEqual([]);
  });

  it('getDescriptionSegments returns plain segment when no keywords', () => {
    comp.description = 'Hello world';
    comp.keywords = [];
    const segments = comp.getDescriptionSegments();
    expect(segments.length).toBe(1);
    expect(segments[0].highlighted).toBeFalse();
    expect(segments[0].text).toBe('Hello world');
  });

  it('getDescriptionSegments highlights matched keywords', () => {
    comp.description = 'Hello world';
    comp.keywords = ['world'];
    const segments = comp.getDescriptionSegments();
    const highlighted = segments.filter(s => s.highlighted);
    expect(highlighted.length).toBe(1);
    expect(highlighted[0].text.toLowerCase()).toBe('world');
  });
});
