import { FeedbackBoxComponent } from './feedback-box.component';
describe('FeedbackBoxComponent', () => {
  it('creates', () => { expect(new FeedbackBoxComponent()).toBeTruthy(); });
  it('ngOnInit no-throw', () => { const c = new FeedbackBoxComponent(); expect(() => c.ngOnInit()).not.toThrow(); });
  it('instances are independent', () => { expect(new FeedbackBoxComponent()).not.toBe(new FeedbackBoxComponent()); });
});
