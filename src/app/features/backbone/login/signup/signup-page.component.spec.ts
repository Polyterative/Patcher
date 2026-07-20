import { of } from 'rxjs';
import { SignupPageComponent } from './signup-page.component';
import { SSOProvider } from '../sso-buttons/sso-buttons.component';
import { ActivatedRoute } from '@angular/router';
import { SeoAndUtilsService } from '../../seo-and-utils.service';
import { UserManagementService } from '../user-management.service';
import { UserSignupDataService } from './user-signup-data.service';

function makeSeoMock(): jasmine.SpyObj<SeoAndUtilsService> {
  return jasmine.createSpyObj<SeoAndUtilsService>('SeoAndUtilsService', ['updateSeo']);
}

function makeLoginInteractionMock(): jasmine.SpyObj<UserManagementService> {
  return jasmine.createSpyObj<UserManagementService>('UserManagementService', ['loginWithSSO']);
}

function makeComp(
  seo = makeSeoMock(),
  loginInteraction = makeLoginInteractionMock()
): {
  comp: SignupPageComponent;
  seo: jasmine.SpyObj<SeoAndUtilsService>;
  loginInteraction: jasmine.SpyObj<UserManagementService>;
} {
  const activated = { queryParams: of({}) } as ActivatedRoute;
  const dataService = {} as UserSignupDataService;

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
