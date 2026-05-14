import { DiscordWidgetComponent } from './discord-widget.component';
describe('DiscordWidgetComponent', () => {
  it('creates', () => { expect(new DiscordWidgetComponent()).toBeTruthy(); });
  it('ngOnInit no-throw', () => { const c = new DiscordWidgetComponent(); expect(() => c.ngOnInit()).not.toThrow(); });
});
