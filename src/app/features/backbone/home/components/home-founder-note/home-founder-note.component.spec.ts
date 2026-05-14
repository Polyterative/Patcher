import { HomeFounderNoteComponent } from './home-founder-note.component';
import { HomeFounderNote } from '../../home-content.models';

describe('HomeFounderNoteComponent', () => {
  let comp: HomeFounderNoteComponent;

  beforeEach(() => {
    comp = new HomeFounderNoteComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('quote defaults to empty string', () => {
    expect(comp.quote).toBe('');
  });

  it('author defaults to empty string', () => {
    expect(comp.author).toBe('');
  });

  it('role defaults to empty string', () => {
    expect(comp.role).toBe('');
  });

  it('stories defaults to empty array', () => {
    expect(comp.stories).toEqual([]);
  });

  describe('resolvedStories', () => {
    it('returns stories array when stories.length > 0', () => {
      const stories: HomeFounderNote[] = [{ quote: 'q', author: 'a', role: 'r' }];
      comp.stories = stories;
      expect(comp.resolvedStories).toBe(stories);
    });

    it('returns empty array when stories empty and quote empty', () => {
      comp.stories = [];
      comp.quote = '';
      expect(comp.resolvedStories).toEqual([]);
    });

    it('returns synthetic story from quote/author/role when stories empty and quote set', () => {
      comp.stories = [];
      comp.quote = 'Great product';
      comp.author = 'Jane';
      comp.role = 'Designer';
      const result = comp.resolvedStories;
      expect(result.length).toBe(1);
      expect(result[0].quote).toBe('Great product');
      expect(result[0].author).toBe('Jane');
      expect(result[0].role).toBe('Designer');
    });
  });
});
