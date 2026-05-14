import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  it('can be instantiated with a storage mock', () => {
    const storageMock: any = {};
    const service = new LocalStorageService(storageMock);
    expect(service).toBeTruthy();
  });

  it('exposes the injected storage instance', () => {
    const storageMock: any = {get: jasmine.createSpy('get')};
    const service = new LocalStorageService(storageMock);
    expect((service as any).storage).toBe(storageMock);
  });
});
