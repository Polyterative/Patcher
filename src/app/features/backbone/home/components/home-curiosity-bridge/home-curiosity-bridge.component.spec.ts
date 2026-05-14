import { HomeCuriosityBridgeComponent } from './home-curiosity-bridge.component';
describe('HomeCuriosityBridgeComponent', () => {
  let comp: HomeCuriosityBridgeComponent;
  beforeEach(() => { comp = new HomeCuriosityBridgeComponent(); });
  it('creates', () => { expect(comp).toBeTruthy(); });
  it('title defaults to empty string', () => { expect(comp.title).toBe(''); });
  it('links defaults to empty array', () => { expect(comp.links).toEqual([]); });
  it('description defaults to empty string', () => { expect(comp.description).toBe(''); });
});
