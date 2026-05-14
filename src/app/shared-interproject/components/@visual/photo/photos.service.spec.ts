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

  it('ngOnDestroy completes destroyEvent$', () => {
    let completed = false;
    (service as any).destroyEvent$.subscribe({ complete: () => (completed = true) });
    service.ngOnDestroy();
    expect(completed).toBe(true);
  });
});
