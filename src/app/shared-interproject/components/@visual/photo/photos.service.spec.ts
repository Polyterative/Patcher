import { PhotosService } from './photos.service';

describe('PhotosService', () => {
  let service: PhotosService;

  beforeEach(() => {
    const httpMock: any = {};
    service = new PhotosService(httpMock);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('initialises url$ with empty string', () => {
    expect(service.url$.getValue()).toBe('');
  });

  it('allows emitting a URL', () => {
    service.url$.next('https://example.com/photo.jpg');
    expect(service.url$.getValue()).toBe('https://example.com/photo.jpg');
  });

  it('ngOnDestroy completes inherited destroy$', () => {
    let completed = false;
    (service as any).destroy$.subscribe({ complete: () => (completed = true) });
    service.ngOnDestroy();
    expect(completed).toBe(true);
  });

  it('loadUnsplash$ starts with no emissions', () => {
    const emissions: string[] = [];
    const sub = service.loadUnsplash$.subscribe(v => emissions.push(v));
    sub.unsubscribe();
    expect(emissions.length).toBe(0);
  });

  it('url$ can be reset to empty string', () => {
    service.url$.next('https://example.com/photo.jpg');
    service.url$.next('');
    expect(service.url$.getValue()).toBe('');
  });
});
