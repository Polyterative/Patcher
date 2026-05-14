import { FaqComponent } from './faq.component';

describe('FaqComponent', () => {
  let comp: FaqComponent;

  beforeEach(() => {
    comp = new FaqComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('data defaults to empty array', () => {
    expect(comp.data).toEqual([]);
  });

  it('accepts data input', () => {
    const items = [{ question: 'What?', answer: 'This.' }];
    comp.data = items;
    expect(comp.data).toBe(items);
  });

  it('data can be replaced with a different array', () => {
    const items = [{question: 'Q1', answer: 'A1'}, {question: 'Q2', answer: 'A2'}];
    comp.data = items;
    expect(comp.data.length).toBe(2);
  });
});
