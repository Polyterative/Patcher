import { FooterComponent } from './footer.component';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';

describe('FooterComponent', () => {
  let comp: FooterComponent;
  let mockAppState: jasmine.SpyObj<AppStateService>;

  beforeEach(() => {
    mockAppState = jasmine.createSpyObj<AppStateService>('AppStateService', ['ngOnDestroy']);
    comp = new FooterComponent(mockAppState);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('instagramUrl points to patcher.xyz instagram', () => {
    expect(comp.instagramUrl).toContain('instagram.com');
    expect(comp.instagramUrl).toContain('patcher.xyz');
  });

  it('instagramHandle is @patcher.xyz', () => {
    expect(comp.instagramHandle).toBe('@patcher.xyz');
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('exposes appState', () => {
    expect(comp.appState).toBe(mockAppState);
  });

  it('data property is defined (build info)', () => {
    expect(comp.data).toBeDefined();
  });
});
