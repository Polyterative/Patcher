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
  
  it('setTitle("") removes title tags', () => {
    const metaSpy = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);
    const serviceDirect = new SeoAndUtilsService(
      jasmine.createSpyObj('Title', ['setTitle']) as any,
      metaSpy,
      document
    );
    
    (serviceDirect as any).setTitle('');
    
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`name='twitter:title'`);
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`name='twitter:image:alt'`);
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`property='og:image:alt'`);
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`property='og:title'`);
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`name='title'`);
  });
  
  it('returns fallback URL when document location href is unavailable', () => {
    const serviceDirect = new SeoAndUtilsService(
      jasmine.createSpyObj('Title', ['setTitle']) as any,
      jasmine.createSpyObj('Meta', ['updateTag', 'removeTag']) as any,
      {location: {href: ''}} as any
    );
    
    expect((serviceDirect as any).getCurrentUrl()).toBe('https://patcher.xyz/');
  });
  
  it('updateCanonicalLink returns early for empty url', () => {
    const doc = {
      querySelector: jasmine.createSpy('querySelector'),
      createElement: jasmine.createSpy('createElement'),
      head: {appendChild: jasmine.createSpy('appendChild')}
    };
    const serviceDirect = new SeoAndUtilsService(
      jasmine.createSpyObj('Title', ['setTitle']) as any,
      jasmine.createSpyObj('Meta', ['updateTag', 'removeTag']) as any,
      doc as any
    );
    
    (serviceDirect as any).updateCanonicalLink('');
    
    expect(doc.querySelector).not.toHaveBeenCalled();
    expect(doc.createElement).not.toHaveBeenCalled();
  });
  
  it('updateSeo catches unexpected errors and logs them', () => {
    const errorSpy = spyOn(console, 'error');
    const metaSpy = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);
    metaSpy.updateTag.and.throwError('meta update failed');
    const serviceDirect = new SeoAndUtilsService(
      jasmine.createSpyObj('Title', ['setTitle']) as any,
      metaSpy,
      document
    );
    
    expect(() =>
      serviceDirect.updateSeo({description: 'd', keywords: 'k', image: 'img'} as any, 'Area')
    ).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
  });
});
