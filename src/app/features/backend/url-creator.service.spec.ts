import { UrlCreatorService } from './url-creator.service';


describe('UrlCreatorService', () => {
  let service: UrlCreatorService;
  let mockSnackBar: jasmine.SpyObj<any>;
  
  beforeEach(() => {
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    service = new UrlCreatorService({} as any, mockSnackBar, {} as any);
  });
  
  it('calls navigator.clipboard.writeText with window.location.origin + path', async () => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    const path = '/modules/details/42';
    const expectedUrl = window.location.origin + path;
    
    service.copyLinkToClipboard(path);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedUrl);
  });
  
  it('calls snackBar.open with success message when clipboard resolves', async () => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    
    service.copyLinkToClipboard('/test');
    await Promise.resolve();
    
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Link copied to clipboard.',
      undefined,
      jasmine.objectContaining({panelClass: 'snack-success'})
    );
  });
  
  it('calls snackBar.open with error message when clipboard rejects', async () => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.reject(new Error('denied')));
    
    service.copyLinkToClipboard('/test');
    await Promise.resolve();
    
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      jasmine.stringContaining('Clipboard write failed'),
      undefined,
      jasmine.objectContaining({panelClass: 'snack-error'})
    );
  });
  
  it('constructs URL from window.location.origin and arbitrary path', async () => {
    let capturedUrl = '';
    spyOn(navigator.clipboard, 'writeText').and.callFake((url: string) => {
      capturedUrl = url;
      return Promise.resolve();
    });
    
    const path = '/racks/view/7';
    service.copyLinkToClipboard(path);
    
    expect(capturedUrl).toBe(window.location.origin + path);
  });
});