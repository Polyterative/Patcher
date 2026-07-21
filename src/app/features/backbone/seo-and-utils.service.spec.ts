import { TestBed } from '@angular/core/testing';
import {
  Meta,
  Title
} from '@angular/platform-browser';
import { SeoSocialShareData } from '../../models/seo.model';
import { SeoAndUtilsService } from './seo-and-utils.service';


type SeoDocumentLocation = Pick<Location, 'origin' | 'pathname' | 'href'>;

function createSeoDocument(location: SeoDocumentLocation): Document {
  const seoDocument = Object.create(Document.prototype) as Document;
  Object.defineProperty(seoDocument, 'location', {
    configurable: true,
    value: location
  });
  return seoDocument;
}

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
    const titleSpy = jasmine.createSpyObj<Title>('Title', ['setTitle']);
    const serviceDirect = new SeoAndUtilsService(
      titleSpy,
      metaSpy,
      document
    );
    
    serviceDirect['setTitle']('');
    
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`name='twitter:title'`);
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`name='twitter:image:alt'`);
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`property='og:image:alt'`);
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`property='og:title'`);
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`name='title'`);
  });
  
  it('returns fallback URL when document location is unavailable', () => {
    const titleSpy = jasmine.createSpyObj<Title>('Title', ['setTitle']);
    const metaSpy = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);
    const serviceDirect = new SeoAndUtilsService(
      titleSpy,
      metaSpy,
      createSeoDocument({origin: '', pathname: '', href: ''})
    );
    
    expect(serviceDirect['getCurrentUrl']()).toBe('https://patcher.xyz/');
  });
  
  it('updateCanonicalLink returns early for empty url', () => {
    const doc = document.implementation.createHTMLDocument('SEO canonical test');
    const querySelectorSpy = spyOn(doc, 'querySelector').and.callThrough();
    const createElementSpy = spyOn(doc, 'createElement').and.callThrough();
    const appendChildSpy = spyOn(doc.head, 'appendChild').and.callThrough();
    const titleSpy = jasmine.createSpyObj<Title>('Title', ['setTitle']);
    const metaSpy = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);
    const serviceDirect = new SeoAndUtilsService(
      titleSpy,
      metaSpy,
      doc
    );
    
    serviceDirect['updateCanonicalLink']('');
    
    expect(querySelectorSpy).not.toHaveBeenCalled();
    expect(createElementSpy).not.toHaveBeenCalled();
    expect(appendChildSpy).not.toHaveBeenCalled();
  });
  
  it('updateSeo catches unexpected errors and logs them', () => {
    const errorSpy = spyOn(console, 'error');
    const metaSpy = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);
    metaSpy.updateTag.and.throwError('meta update failed');
    const titleSpy = jasmine.createSpyObj<Title>('Title', ['setTitle']);
    const seoData: SeoSocialShareData = {description: 'd', keywords: 'k', image: 'img'};
    const serviceDirect = new SeoAndUtilsService(
      titleSpy,
      metaSpy,
      document
    );
    
    expect(() =>
      serviceDirect.updateSeo(seoData, 'Area')
    ).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('setTitle with non-empty title calls updateTag for twitter:title', () => {
    const metaSpy = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);
    const titleSpy = jasmine.createSpyObj<Title>('Title', ['setTitle']);
    const serviceDirect = new SeoAndUtilsService(titleSpy, metaSpy, document);

    serviceDirect['setTitle']('Patcher Module');

    expect(metaSpy.updateTag).toHaveBeenCalledWith({name: 'twitter:title', content: 'Patcher Module'});
    expect(metaSpy.updateTag).toHaveBeenCalledWith({name: 'title', content: 'Patcher Module'});
    expect(metaSpy.removeTag).not.toHaveBeenCalled();
  });
});
