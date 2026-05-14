import { of } from 'rxjs';
import { SignupPageComponent } from './signup-page.component';
import { SSOProvider } from '../sso-buttons/sso-buttons.component';

function makeSeoMock() {
  return { updateSeo: jasmine.createSpy('updateSeo') } as any;
}

function makeLoginInteractionMock() {
  return {
    loginWithSSO: jasmine.createSpy('loginWithSSO')
  } as any;
}

function makeComp(
  seo = makeSeoMock(),
  loginInteraction = makeLoginInteractionMock()
): { comp: SignupPageComponent; seo: any; loginInteraction: any } {
  const activated = { queryParams: of({}) } as any;
  const dataService = {} as any;

  const comp = new SignupPageComponent(activated, dataService, seo, loginInteraction);
  return { comp, seo, loginInteraction };
}

describe('SignupPageComponent', () => {
  describe('construction', () => {
    it('creates without error', () => {
      expect(() => makeComp().comp).not.toThrow();
    });

    it('calls updateSeo with noindex:true on construction', () => {
      const { seo } = makeComp();
      expect(seo.updateSeo).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ noindex: true }),
        jasmine.any(String)
      );
    });
  });

  describe('ngOnInit', () => {
    it('does not throw', () => {
      const { comp } = makeComp();
      expect(() => comp.ngOnInit()).not.toThrow();
    });
  });

  describe('handleSSOSignup', () => {
    it('delegates to loginInteraction.loginWithSSO', () => {
      const loginInteraction = makeLoginInteractionMock();
      const { comp } = makeComp(makeSeoMock(), loginInteraction);
      comp.handleSSOSignup('google' as SSOProvider);
      expect(loginInteraction.loginWithSSO).toHaveBeenCalledOnceWith('google');
    });

    it('passes the provider argument through', () => {
      const loginInteraction = makeLoginInteractionMock();
      const { comp } = makeComp(makeSeoMock(), loginInteraction);
      comp.handleSSOSignup('github' as SSOProvider);
      expect(loginInteraction.loginWithSSO).toHaveBeenCalledWith('github');
    });
  });
});
