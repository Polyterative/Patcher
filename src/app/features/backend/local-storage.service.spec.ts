import { StorageMap } from '@ngx-pwa/local-storage';
import { LocalStorageService } from './local-storage.service';

function buildStorageMock(): jasmine.SpyObj<StorageMap> {
  return jasmine.createSpyObj<StorageMap>('StorageMap', ['get']);
}

describe('LocalStorageService', () => {
  it('can be instantiated with a storage mock', () => {
    const storageMock = buildStorageMock();
    const service = new LocalStorageService(storageMock);
    expect(service).toBeTruthy();
  });

  it('exposes the injected storage instance', () => {
    const storageMock = buildStorageMock();
    const service = new LocalStorageService(storageMock);
    expect(service['storage']).toBe(storageMock);
  });
});
