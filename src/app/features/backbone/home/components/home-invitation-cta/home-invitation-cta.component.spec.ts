import { HomeInvitationCtaComponent } from './home-invitation-cta.component';
describe('HomeInvitationCtaComponent', () => {
  let comp: HomeInvitationCtaComponent;
  beforeEach(() => { comp = new HomeInvitationCtaComponent(); });
  it('creates', () => { expect(comp).toBeTruthy(); });
  it('title defaults to empty string', () => { expect(comp.title).toBe(''); });
  it('imageSrc defaults to empty string', () => { expect(comp.imageSrc).toBe(''); });
  it('imageAlt defaults to empty string', () => { expect(comp.imageAlt).toBe(''); });
  it('description defaults to empty string', () => { expect(comp.description).toBe(''); });
});
