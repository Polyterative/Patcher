import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  let comp: NotFoundComponent;
  let mockMeta: { updateTag: jasmine.Spy };
  let mockTitle: { setTitle: jasmine.Spy };

  beforeEach(() => {
    mockMeta = { updateTag: jasmine.createSpy('updateTag') };
    mockTitle = { setTitle: jasmine.createSpy('setTitle') };
    comp = new NotFoundComponent(mockMeta as any, mockTitle as any);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit sets the page title to 404 message', () => {
    comp.ngOnInit();
    expect(mockTitle.setTitle).toHaveBeenCalledWith('404 - Not Found | patcher.xyz');
  });

  it('ngOnInit sets robots meta to noindex,nofollow', () => {
    comp.ngOnInit();
    expect(mockMeta.updateTag).toHaveBeenCalledWith({ name: 'robots', content: 'noindex, nofollow' });
  });

  it('ngOnInit updates description meta tag', () => {
    comp.ngOnInit();
    expect(mockMeta.updateTag).toHaveBeenCalledWith({ name: 'description', content: '404 - Not Found' });
  });

  it('ngOnInit updates og:title meta tag', () => {
    comp.ngOnInit();
    expect(mockMeta.updateTag).toHaveBeenCalledWith(
      jasmine.objectContaining({ property: 'og:title' })
    );
  });

  it('ngOnInit updates og:description meta tag', () => {
    comp.ngOnInit();
    expect(mockMeta.updateTag).toHaveBeenCalledWith(
      jasmine.objectContaining({ property: 'og:description' })
    );
  });
});
