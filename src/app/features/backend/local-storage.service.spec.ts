import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  it('can be instantiated with a storage mock', () => {
    const storageMock: any = {};
    const service = new LocalStorageService(storageMock);
    expect(service).toBeTruthy();
  });
});
