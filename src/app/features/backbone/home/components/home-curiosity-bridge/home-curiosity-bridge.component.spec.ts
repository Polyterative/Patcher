import { HomeCuriosityBridgeComponent } from './home-curiosity-bridge.component';
describe('HomeCuriosityBridgeComponent', () => {
  let comp: HomeCuriosityBridgeComponent;
  beforeEach(() => { comp = new HomeCuriosityBridgeComponent(); });
  it('creates', () => { expect(comp).toBeTruthy(); });
  it('title defaults to empty string', () => { expect(comp.title).toBe(''); });
  it('links defaults to empty array', () => { expect(comp.links).toEqual([]); });
  it('description defaults to empty string', () => { expect(comp.description).toBe(''); });
  it('title input can be assigned', () => {
    comp.title = 'Explore More';
    expect(comp.title).toBe('Explore More');
  });
  it('links input can be assigned', () => {
    comp.links = [{icon: 'inventory_2', label: 'Modules', href: '/modules'}];
    expect(comp.links.length).toBe(1);
  });
});
