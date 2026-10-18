import { environment } from 'src/environments/environment';
import { AppFaqComponent } from './app-faq.component';

describe('AppFaqComponent', () => {
  let comp: AppFaqComponent;

  beforeEach(() => {
    comp = new AppFaqComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('faq has 9 items when ModularGrid import is enabled', () => {
    const previous = environment.features.modularGridImportEnabled;
    environment.features.modularGridImportEnabled = true;
    try {
      expect(new AppFaqComponent().faq.length).toBe(9);
    } finally {
      environment.features.modularGridImportEnabled = previous;
    }
  });

  it('omits the ModularGrid entry when the import flag is off', () => {
    const previous = environment.features.modularGridImportEnabled;
    environment.features.modularGridImportEnabled = false;
    try {
      const faq = new AppFaqComponent().faq;
      expect(faq.length).toBe(8);
      expect(faq.some(item => item.question.includes('ModularGrid'))).toBeFalse();
    } finally {
      environment.features.modularGridImportEnabled = previous;
    }
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
