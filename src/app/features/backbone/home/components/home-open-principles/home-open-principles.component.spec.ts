import { HomeOpenPrinciplesComponent } from './home-open-principles.component';

describe('HomeOpenPrinciplesComponent', () => {
  let comp: HomeOpenPrinciplesComponent;

  beforeEach(() => { comp = new HomeOpenPrinciplesComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('cards defaults to empty array', () => {
    expect(comp.cards).toEqual([]);
  });

  it('getCardDescriptionSegments returns empty for card with empty description', () => {
    const card = { icon: 'i', title: 't', description: '', keywords: [] };
    expect(comp.getCardDescriptionSegments(card)).toEqual([]);
  });

  it('getCardDescriptionSegments highlights keywords', () => {
    const card = { icon: 'i', title: 't', description: 'Open source', keywords: ['Open'] };
    const segments = comp.getCardDescriptionSegments(card);
    expect(segments.some(s => s.highlighted)).toBeTrue();
  });
});
