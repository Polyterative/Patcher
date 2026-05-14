import { AppFaqComponent } from './app-faq.component';

describe('AppFaqComponent', () => {
  let comp: AppFaqComponent;

  beforeEach(() => {
    comp = new AppFaqComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('faq has 9 items', () => {
    expect(comp.faq.length).toBe(9);
  });

  it('first faq item has question and answer', () => {
    const first = comp.faq[0];
    expect(first.question.length).toBeGreaterThan(0);
    expect(first.answer.length).toBeGreaterThan(0);
  });

  it('every faq item has a non-empty icon', () => {
    comp.faq.forEach(item => {
      expect(item.icon!.length).toBeGreaterThan(0);
    });
  });

  it('every faq item has unique question text', () => {
    const questions = comp.faq.map(item => item.question);
    const unique = new Set(questions);
    expect(unique.size).toBe(questions.length);
  });

  it('roadmap link points to ROADMAP.md', () => {
    const roadmapItem = comp.faq.find(item => item.link?.includes('ROADMAP'));
    expect(roadmapItem).toBeTruthy();
    expect(roadmapItem!.link).toContain('ROADMAP.md');
  });
});
