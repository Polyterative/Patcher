import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { SeoAndUtilsService } from './seo-and-utils.service';


describe('SeoAndUtilsService', () => {
  let service: SeoAndUtilsService;
  let meta: Meta;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SeoAndUtilsService]
    });
    service = TestBed.inject(SeoAndUtilsService);
    meta = TestBed.inject(Meta);
  });
  
  afterEach(() => {
    TestBed.resetTestingModule();
  });
  
  it('should create and update canonical link tag', () => {
    document.querySelector('link[rel="canonical"]')?.remove();
    const canonicalUrl = 'https://patcher.xyz/modules/details/72';
    
    service.updateSeo({
      url: canonicalUrl,
      image: 'https://patcher.xyz/assets/png/patcher_seo_hero.png',
      description: 'Module details',
      keywords: 'eurorack,module'
    }, 'Module Details');
    
    const canonicalTag = document.querySelector('link[rel="canonical"]');
    expect(canonicalTag).withContext('canonical link should exist').not.toBeNull();
    expect(canonicalTag?.getAttribute('href')).toBe(canonicalUrl);
  });
  
  it('should set og image dimensions and twitter URL tags', () => {
    const canonicalUrl = 'https://patcher.xyz/patches/details/44';
    
    service.updateSeo({
      url: canonicalUrl,
      image: 'https://patcher.xyz/assets/png/patcher_seo_hero.png',
      description: 'Patch details',
      keywords: 'eurorack,patch'
    }, 'Patch Details');
    
    expect(meta.getTag(`property='og:image:width'`)?.content).toBe('1200');
    expect(meta.getTag(`property='og:image:height'`)?.content).toBe('630');
    expect(meta.getTag(`name='twitter:url'`)?.content).toBe(canonicalUrl);
    expect(meta.getTag(`property='og:url'`)?.content).toBe(canonicalUrl);
  });
});