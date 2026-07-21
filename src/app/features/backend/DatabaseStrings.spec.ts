import {
  DbPaths,
  DbStoragePaths,
  QueryJoins,
  StorageUrls
} from './DatabaseStrings';
import { MODULE_PANEL_STORAGE_BASE_URL } from './storage-url.constants';


describe('DbPaths', () => {
  it('exposes correct table name strings', () => {
    expect(DbPaths.modules).toBe('modules');
    expect(DbPaths.manufacturers).toBe('manufacturers');
    expect(DbPaths.manufacturer_claims).toBe('manufacturer_claims');
    expect(DbPaths.module_availability_tags).toBe('module_availability_tags');
    expect(DbPaths.racks).toBe('racks');
    expect(DbPaths.patches).toBe('patches');
    expect(DbPaths.patch_connections).toBe('patch_connections');
    expect(DbPaths.module_tags).toBe('module_tags');
    expect(DbPaths.tags).toBe('tags');
    expect(DbPaths.profiles).toBe('profiles');
    expect(DbPaths.comments).toBe('comments');
    expect(DbPaths.marketplace_listings).toBe('marketplace_listings');
    expect(DbPaths.listing_media).toBe('listing_media');
  });
  
  it('all path values are non-empty strings', () => {
    const values = Object.values(DbPaths);
    for (const value of values) {
      expect(typeof value).toBe('string');
      if (typeof value !== 'string') {
        fail('DbPaths exposes only string path constants.');
        continue;
      }
      expect(value.length).toBeGreaterThan(0);
    }
  });
});


describe('DbStoragePaths', () => {
  it('exposes storage bucket name strings', () => {
    expect(DbStoragePaths.module_panels).toBe('module-panels');
    expect(DbStoragePaths.manufacturer_logos).toBe('manufacturer-logos');
    expect(DbStoragePaths.racks).toBe('racks');
    expect(DbStoragePaths.marketplace_listings).toBe('marketplace-listings');
  });
});


describe('StorageUrls', () => {
  it('routes public storage reads through the Cloudflare image proxy', () => {
    expect(StorageUrls.modulePanels).toBe('https://images.patcher.xyz/module-panels/');
    expect(StorageUrls.racks).toBe('https://images.patcher.xyz/racks/');
    expect(StorageUrls.patches).toBe('https://images.patcher.xyz/patches/');
    expect(StorageUrls.marketplaceListings).toBe('https://images.patcher.xyz/marketplace-listings/');
  });
});


describe('QueryJoins', () => {
  it('manufacturer join string contains the expected alias and table reference', () => {
    expect(QueryJoins.manufacturer).toContain('manufacturer');
    expect(QueryJoins.manufacturer).toContain('manufacturerId');
  });
  
  it('standard join string references the standards table', () => {
    expect(QueryJoins.standard).toContain('standards');
  });
  
  it('author join string references authorid', () => {
    expect(QueryJoins.author).toContain('authorid');
  });
  
  it('insOuts join string contains both ins and outs', () => {
    expect(QueryJoins.insOuts).toContain('ins');
    expect(QueryJoins.insOuts).toContain('outs');
  });
  
  it('module_tags join references the tags table', () => {
    expect(QueryJoins.module_tags).toContain('tags');
  });

  it('rack-module module join includes module tags for downstream rack analysis', () => {
    expect(QueryJoins.module_fk_rackmodules).toContain('tags:module_tags');
    expect(QueryJoins.module_fk_rackmodules).toContain('voteCount:user_module_tags');
    expect(QueryJoins.module_fk_rackmodules).toContain('ins:module_ins');
    expect(QueryJoins.module_fk_rackmodules).toContain('outs:module_outs');
  });
  
  it('module_panels join string contains the module_panels table reference', () => {
    expect(QueryJoins.module_panels).toContain('module_panels');
  });

  it('exposes the module panel storage base URL through a backend-owned constant', () => {
    expect(MODULE_PANEL_STORAGE_BASE_URL).toBe(StorageUrls.modulePanels);
  });

  it('collection module joins include module panels for module thumbnails', () => {
    expect(QueryJoins.collectionModule).toContain('panels:module_panels');
    expect(QueryJoins.collectionEntryModule).toContain('panels:module_panels');
  });
});
