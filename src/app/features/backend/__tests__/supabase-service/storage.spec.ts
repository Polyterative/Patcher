import { SupabaseService } from '../../supabase.service';
import { StorageUrls } from '../../DatabaseStrings';
import {
  getMarketplaceListingImagePublicUrl,
  getModulePanelPublicUrl,
  getRackImagePublicUrl
} from '../../supabase-storage';
import { environment } from 'src/environments/environment';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  authUserFixture,
  getSupabaseClientDouble,
  mockUserSession,
  type SupabaseClientDouble
} from './supabase-query-test-doubles';
import type { SupabaseStorageFile } from '../../supabase.types';


const TEST_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
type StorageBucketName = 'marketplace-listings' | 'module-panels' | 'patches' | 'racks';
type StorageProviderError = {
  message: string;
  name?: string;
};
type StorageUploadData = {
  path: string;
};
type StorageRemoveData = {
  name: string;
};
type StorageSignedUrlData = {
  signedUrl: string;
};
type StorageUploadResult = {
  data: StorageUploadData | null;
  error: StorageProviderError | null;
};
type StorageRemoveResult = {
  data: StorageRemoveData[] | null;
  error: StorageProviderError | null;
};
type StorageSignedUrlResult = {
  data: StorageSignedUrlData | null;
  error: StorageProviderError | null;
};
type StorageUploadOptions = {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
};
type StorageUploadFn = (
  path: string,
  file: SupabaseStorageFile,
  options?: StorageUploadOptions
) => Promise<StorageUploadResult>;
type StorageRemoveFn = (paths: string[]) => Promise<StorageRemoveResult>;
type StorageCreateSignedUrlFn = (path: string, expiresIn: number) => Promise<StorageSignedUrlResult>;
type StorageFromFn = (bucket: StorageBucketName) => StorageBucketDouble;
type StorageRootDouble = {
  from: StorageFromFn;
};
type StorageBucketDouble = {
  createSignedUrl: jasmine.Spy<StorageCreateSignedUrlFn>;
  upload: jasmine.Spy<StorageUploadFn>;
  remove: jasmine.Spy<StorageRemoveFn>;
};
type StorageSupabaseClientDouble = SupabaseClientDouble & {
  storage: StorageRootDouble;
};

function getStorageSupabaseClientDouble(service: SupabaseService): StorageSupabaseClientDouble {
  const client = getSupabaseClientDouble(service);
  const storage = Reflect.get(client, 'storage');

  if (!isStorageRootDouble(storage)) {
    throw new Error('Supabase test setup did not expose a storage client double.');
  }

  return {
    ...client,
    storage
  };
}

function isStorageRootDouble(value: unknown): value is StorageRootDouble {
  return typeof value === 'object'
    && value !== null
    && typeof Reflect.get(value, 'from') === 'function';
}

function storageUploadSuccess(path = 'file.jpg'): StorageUploadResult {
  return {
    data: {path},
    error: null
  };
}

function storageRemoveSuccess(name = 'file.jpg'): StorageRemoveResult {
  return {
    data: [{name}],
    error: null
  };
}

function storageSignedUrlSuccess(signedUrl = 'https://signed.example.test/front.webp?token=abc'): StorageSignedUrlResult {
  return {
    data: {signedUrl},
    error: null
  };
}

describe('SupabaseService - storage', () => {
  let service: SupabaseService;
  let supabaseClient: StorageSupabaseClientDouble;
  let mockBucket: StorageBucketDouble;
  let previousSupabaseUrl: string;
  
  function setupStorageMock(
    uploadResult: StorageUploadResult = storageUploadSuccess(),
    removeResult: StorageRemoveResult = storageRemoveSuccess(),
    signedUrlResult: StorageSignedUrlResult = storageSignedUrlSuccess()
  ) {
    mockBucket = {
      createSignedUrl: jasmine.createSpy<StorageCreateSignedUrlFn>('createSignedUrl')
        .and.returnValue(Promise.resolve(signedUrlResult)),
      upload: jasmine.createSpy<StorageUploadFn>('upload').and.returnValue(Promise.resolve(uploadResult)),
      remove: jasmine.createSpy<StorageRemoveFn>('remove').and.returnValue(Promise.resolve(removeResult))
    };
    spyOn(supabaseClient.storage, 'from').and.returnValue(mockBucket);
  }
  
  beforeAll(() => {
    previousSupabaseUrl = environment.supabase.url;
    environment.supabase.url = TEST_SUPABASE_URL;
  });

  afterAll(() => {
    environment.supabase.url = previousSupabaseUrl;
  });

  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
    supabaseClient = getStorageSupabaseClientDouble(service);
  });
  
  afterEach(() => {
    cleanupSupabaseServiceTest();
  });

  describe('storage.publicUrlBases', () => {
    it('exposes public storage base URLs without requiring DatabaseStrings imports in components', () => {
      expect(service.storage.publicUrlBases.manufacturerLogos).toBe(StorageUrls.manufacturerLogos);
      expect(service.storage.publicUrlBases.marketplaceListings).toBe(StorageUrls.marketplaceListings);
    });

    describe('getMarketplaceListingImagePublicUrl', () => {
      it('builds the proxied marketplace listing storage URL', () => {
        expect(getMarketplaceListingImagePublicUrl('seller/listing/front.webp'))
          .toBe('https://images.patcher.xyz/marketplace-listings/seller/listing/front.webp');
      });
    });
  });

  describe('getModulePanelPublicUrl', () => {
    it('builds the proxied module-panel storage URL by default', () => {
      expect(getModulePanelPublicUrl('panel.webp'))
        .toBe('https://images.patcher.xyz/module-panels/panel.webp');
    });

    it('builds the direct Supabase module-panel storage URL for fallback loads', () => {
      expect(getModulePanelPublicUrl('panel.webp', true))
        .toBe('https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/module-panels/panel.webp');
    });
  });

  describe('getRackImagePublicUrl', () => {
    it('builds the proxied rack image storage URL by default', () => {
      expect(getRackImagePublicUrl('rack.webp'))
        .toBe('https://images.patcher.xyz/racks/rack.webp');
    });

    it('builds the direct Supabase rack image storage URL for fallback loads', () => {
      expect(getRackImagePublicUrl('rack.webp', true))
        .toBe('https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/racks/rack.webp');
    });
  });
  
  describe('storage.deletePanelFile', () => {
    it('should call remove on the module_panels bucket', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();

      service.storage.deletePanelFile('panel.jpg').subscribe({
        next: () => {
          expect(supabaseClient.storage.from).toHaveBeenCalledWith('module-panels');
          expect(mockBucket.remove).toHaveBeenCalledWith(['panel.jpg']);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });

    }, TEST_TIMEOUT);

    it('should bust modules, moduleWithId and rackWithId caches', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();
      const bustedKeys: string[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as string[])));

      service.storage.deletePanelFile('test.jpg').subscribe({
        next: () => {
          expect(bustedKeys).toContain('modules');
          expect(bustedKeys).toContain('moduleWithId');
          expect(bustedKeys).toContain('rackWithId');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      mockUserSession(service, null);

      service.storage.deletePanelFile('panel.jpg').subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('storage.deleteRackImage', () => {
    it('should normalise filename and call remove on the racks bucket', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();

      service.storage.deleteRackImage('RACK.JPG').subscribe({
        next: () => {
          expect(supabaseClient.storage.from).toHaveBeenCalledWith('racks');
          expect(mockBucket.remove).toHaveBeenCalledWith(['rack.jpg']);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust rackWithId cache', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();
      const bustedKeys: string[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as string[])));

      service.storage.deleteRackImage('rack.jpg').subscribe({
        next: () => {
          expect(bustedKeys).toContain('rackWithId');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      mockUserSession(service, null);

      service.storage.deleteRackImage('rack.jpg').subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('storage.deletePatchPreview', () => {
    it('should normalise filename and call remove on the patches bucket', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();

      service.storage.deletePatchPreview('PATCH_1_V20260618T201530123Z.SVG').subscribe({
        next: () => {
          expect(supabaseClient.storage.from).toHaveBeenCalledWith('patches');
          expect(mockBucket.remove).toHaveBeenCalledWith(['patch_1_v20260618t201530123z.svg']);
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust patch list caches', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();
      const bustedKeys: string[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as string[])));

      service.storage.deletePatchPreview('patch_1_v20260618t201530123z.svg').subscribe({
        next: () => {
          expect(bustedKeys).toContain('patches');
          expect(bustedKeys).toContain('patchesWithModule');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      mockUserSession(service, null);

      service.storage.deletePatchPreview('patch_1_v20260618t201530123z.svg').subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('storage.uploadModulePanel', () => {
    it('should return the lowercased filename', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();

      service.storage.uploadModulePanel(new Blob(), 'Panel.JPG').subscribe({
        next: (filename) => {
          expect(filename).toBe('panel.jpg');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should preserve a custom webp content type during upload', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();

      service.storage.uploadModulePanel(new Blob([], {type: 'image/webp'}), 'Panel.WebP', 'image/webp').subscribe({
        next: (filename) => {
          expect(filename).toBe('panel.webp');
          expect(mockBucket.upload).toHaveBeenCalledWith('panel.webp', jasmine.any(Blob), jasmine.objectContaining({
            contentType: 'image/webp'
          }));
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should default the upload content type to image/jpeg when none is provided', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();

      service.storage.uploadModulePanel(new Blob(), 'Panel.JPG').subscribe({
        next: (filename) => {
          expect(filename).toBe('panel.jpg');
          expect(mockBucket.upload).toHaveBeenCalledWith('panel.jpg', jasmine.any(Blob), jasmine.objectContaining({
            contentType: 'image/jpeg'
          }));
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should call both upload and remove on module_panels bucket', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();

      service.storage.uploadModulePanel(new Blob(), 'panel.jpg').subscribe({
        next: () => {
          expect(supabaseClient.storage.from).toHaveBeenCalledWith('module-panels');
          expect(mockBucket.upload).toHaveBeenCalled();
          expect(mockBucket.remove).toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust module caches after successful upload', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();
      const bustedKeys: string[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as string[])));

      service.storage.uploadModulePanel(new Blob(), 'panel.jpg').subscribe({
        next: () => {
          expect(bustedKeys).toContain('modules');
          expect(bustedKeys).toContain('moduleWithId');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      mockUserSession(service, null);

      service.storage.uploadModulePanel(new Blob(), 'panel.jpg').subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });
  
  describe('storage.uploadRackImage', () => {
    it('should upload to racks bucket and return a timestamped filename', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();
      
      service.storage.uploadRackImage(new Blob(), 'rack.jpg').subscribe({
        next: (filename) => {
          expect(typeof filename).toBe('string');
          expect(filename).toContain('rack');
          expect(mockBucket.upload).toHaveBeenCalled();
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
    
    it('should bust rackWithId cache', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();
      const bustedKeys: string[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as string[])));
      
      service.storage.uploadRackImage(new Blob(), 'rack.jpg').subscribe({
        next: () => {
          expect(bustedKeys).toContain('rackWithId');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

  describe('storage.uploadPatchPreview', () => {
    it('should upload SVG to patches bucket and return the normalised filename', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock({data: {path: 'patch_1_v20260618t201530123z.svg'}, error: null});

      service.storage.uploadPatchPreview(new Blob([], {type: 'image/svg+xml'}), 'PATCH_1_V20260618T201530123Z.SVG').subscribe({
        next: (filename) => {
          expect(filename).toBe('patch_1_v20260618t201530123z.svg');
          expect(supabaseClient.storage.from).toHaveBeenCalledWith('patches');
          expect(mockBucket.upload).toHaveBeenCalledWith(
            'patch_1_v20260618t201530123z.svg',
            jasmine.any(Blob),
            jasmine.objectContaining({
              cacheControl: '31536000',
              contentType: 'image/svg+xml',
              upsert: true
            })
          );
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should bust patch list caches', (done) => {
      mockUserSession(service, authUserFixture('u1'));
      setupStorageMock();
      const bustedKeys: string[] = [];
      service.cacheResetter$.subscribe(keys => bustedKeys.push(...(keys as string[])));

      service.storage.uploadPatchPreview(new Blob([], {type: 'image/svg+xml'}), 'patch_1_v20260618t201530123z.svg').subscribe({
        next: () => {
          expect(bustedKeys).toContain('patches');
          expect(bustedKeys).toContain('patchesWithModule');
          done();
        },
        error: (err) => {
          fail(err);
          done();
        }
      });
    }, TEST_TIMEOUT);

    it('should error when user is not authenticated', (done) => {
      mockUserSession(service, null);

      service.storage.uploadPatchPreview(new Blob([], {type: 'image/svg+xml'}), 'patch_1_v20260618t201530123z.svg').subscribe({
        next: () => {
          fail('Expected error for unauthenticated call');
          done();
        },
        error: (err) => {
          expect(err.message).toContain('Authentication required');
          done();
        }
      });
    }, TEST_TIMEOUT);
  });

describe('storage.uploadMarketplaceListingImage', () => {
  const sellerId = '11111111-1111-1111-1111-111111111111';
  const listingId = '22222222-2222-2222-2222-222222222222';

  it('uploads image media to an owner/listing scoped path with MIME-matched extension', (done) => {
    mockUserSession(service, authUserFixture(sellerId));
    setupStorageMock();

    service.storage.uploadMarketplaceListingImage(
      listingId,
      new Blob([], {type: 'image/webp'}),
      'Front Panel.JPG',
      'image/webp'
    ).subscribe({
      next: (path) => {
        expect(path).toMatch(new RegExp(`^${ sellerId }/${ listingId }/front-panel_[0-9-]+\\.webp$`));
        expect(supabaseClient.storage.from).toHaveBeenCalledWith('marketplace-listings');
        expect(mockBucket.upload).toHaveBeenCalledWith(
          path,
          jasmine.any(Blob),
          jasmine.objectContaining({
            cacheControl: '31536000',
            contentType: 'image/webp',
            upsert: false
          })
        );
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('rejects oversized listing media before upload', (done) => {
    mockUserSession(service, authUserFixture(sellerId));
    setupStorageMock();

    service.storage.uploadMarketplaceListingImage(
      listingId,
      new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], {type: 'image/webp'}),
      'demo.webp',
      'image/webp'
    ).subscribe({
      next: () => fail('Expected media size error'),
      error: (err) => {
        expect(err.message).toContain('10 MB or smaller');
        expect(mockBucket.upload).not.toHaveBeenCalled();
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('storage.createMarketplaceListingImageSignedUrl', () => {
  it('creates a short-lived signed URL from the private marketplace listing bucket', (done) => {
    setupStorageMock();

    service.storage.createMarketplaceListingImageSignedUrl(
      '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/front.webp'
    ).subscribe({
      next: (url) => {
        expect(url).toBe('https://signed.example.test/front.webp?token=abc');
        expect(supabaseClient.storage.from).toHaveBeenCalledWith('marketplace-listings');
        expect(mockBucket.createSignedUrl).toHaveBeenCalledWith(
          '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/front.webp',
          600
        );
        done();
      },
      error: (err) => {
        fail(err);
        done();
      }
    });
  }, TEST_TIMEOUT);

  it('surfaces signing failures without falling back to a public private-bucket URL', (done) => {
    setupStorageMock(
      storageUploadSuccess(),
      storageRemoveSuccess(),
      {data: null, error: {message: 'signing denied'}}
    );

    service.storage.createMarketplaceListingImageSignedUrl(
      '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/front.webp'
    ).subscribe({
      next: () => fail('Expected signing error'),
      error: (err) => {
        expect(err.message).toBe('signing denied');
        done();
      }
    });
  }, TEST_TIMEOUT);
});

describe('storage.deleteMarketplaceListingImage', () => {
  it('rejects deleting another seller path before storage remove', (done) => {
    mockUserSession(service, authUserFixture('11111111-1111-1111-1111-111111111111'));
    setupStorageMock();

    service.storage.deleteMarketplaceListingImage(
      '99999999-9999-9999-9999-999999999999/22222222-2222-2222-2222-222222222222/front.webp'
    ).subscribe({
      next: () => fail('Expected owner path error'),
      error: (err) => {
        expect(err.message).toContain('not owned');
        expect(mockBucket.remove).not.toHaveBeenCalled();
        done();
      }
    });
  }, TEST_TIMEOUT);
});
});
