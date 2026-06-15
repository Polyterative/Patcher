import { NotFoundComponent } from './not-found.component';
import {
  Meta,
  Title
} from '@angular/platform-browser';

describe('NotFoundComponent', () => {
  let comp: NotFoundComponent;
  let mockMeta: { updateTag: jasmine.Spy };
  let mockTitle: { setTitle: jasmine.Spy };

  beforeEach(() => {
    mockMeta = { updateTag: jasmine.createSpy('updateTag') };
    mockTitle = { setTitle: jasmine.createSpy('setTitle') };
    comp = new NotFoundComponent(mockMeta as unknown as Meta, mockTitle as unknown as Title);
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

  it('ngOnInit sets the server response status to 404 when available', () => {
    const responseInit: ResponseInit = {};
    comp = new NotFoundComponent(mockMeta as unknown as Meta, mockTitle as unknown as Title, responseInit);

    comp.ngOnInit();

    expect(responseInit.status).toBe(404);
  });
});
