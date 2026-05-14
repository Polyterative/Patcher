import { HomeInvitationCtaComponent } from './home-invitation-cta.component';
describe('HomeInvitationCtaComponent', () => {
  let comp: HomeInvitationCtaComponent;
  beforeEach(() => { comp = new HomeInvitationCtaComponent(); });
  it('creates', () => { expect(comp).toBeTruthy(); });
  it('title defaults to empty string', () => { expect(comp.title).toBe(''); });
  it('imageSrc defaults to empty string', () => { expect(comp.imageSrc).toBe(''); });
  it('imageAlt defaults to empty string', () => { expect(comp.imageAlt).toBe(''); });
  it('description defaults to empty string', () => { expect(comp.description).toBe(''); });
  it('title input can be assigned', () => {
    comp.title = 'Welcome';
    expect(comp.title).toBe('Welcome');
  });
  it('imageSrc input can be assigned', () => {
    comp.imageSrc = '/assets/img.png';
    expect(comp.imageSrc).toBe('/assets/img.png');
  });
});
