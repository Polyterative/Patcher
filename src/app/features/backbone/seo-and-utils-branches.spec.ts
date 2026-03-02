import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { SeoAndUtilsService } from './seo-and-utils.service';


describe('SeoAndUtilsService - additional branches', () => {
  it('setTitle with no argument (default empty string) removes all title-related meta tags', () => {
    const metaSpy = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);
    const titleSpy = jasmine.createSpyObj('Title', ['setTitle']);
    const service = new SeoAndUtilsService(titleSpy, metaSpy, document);
    
    // Call with no arg → triggers the default '' parameter
    (service as any).setTitle();
    
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`name='twitter:title'`);
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`name='twitter:image:alt'`);
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`property='og:image:alt'`);
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`property='og:title'`);
    expect(metaSpy.removeTag).toHaveBeenCalledWith(`name='title'`);
  });
  
  it('updateSeo falls back to defaults.author when data.author is not provided', () => {
    TestBed.configureTestingModule({providers: [SeoAndUtilsService]});
    const service = TestBed.inject(SeoAndUtilsService);
    const meta = TestBed.inject(Meta);
    
    service.updateSeo({
      description: 'Patch details',
      keywords: 'eurorack',
      image: 'https://patcher.xyz/assets/png/patcher_seo_hero.png'
    }, 'Area');
    
    const authorTag = meta.getTag(`name='author'`);
    expect(authorTag?.content).toBe('patcher.xyz');
    
    TestBed.resetTestingModule();
  });
  
  it('updateSeo falls back to og:type "website" when not specified', () => {
    TestBed.configureTestingModule({providers: [SeoAndUtilsService]});
    const service = TestBed.inject(SeoAndUtilsService);
    const meta = TestBed.inject(Meta);
    
    service.updateSeo({
      description: 'test',
      keywords: 'test',
      image: 'img'
    }, 'Test Area');
    
    expect(meta.getTag(`property='og:type'`)?.content).toBe('website');
    
    TestBed.resetTestingModule();
  });
  
  it('getCurrentUrl returns document href when available', () => {
    const service = new SeoAndUtilsService(
      jasmine.createSpyObj('Title', ['setTitle']) as any,
      jasmine.createSpyObj('Meta', ['updateTag', 'removeTag']) as any,
      {location: {href: 'https://patcher.xyz/modules'}} as any
    );
    
    expect((service as any).getCurrentUrl()).toBe('https://patcher.xyz/modules');
  });
  
  it('updateCanonicalLink reuses existing canonical link element', () => {
    // Set up a real document state
    document.querySelector('link[rel="canonical"]')?.remove();
    const link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', 'https://patcher.xyz/old');
    document.head.appendChild(link);
    
    TestBed.configureTestingModule({providers: [SeoAndUtilsService]});
    const service = TestBed.inject(SeoAndUtilsService);
    
    (service as any).updateCanonicalLink('https://patcher.xyz/new');
    
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    expect(canonical?.getAttribute('href')).toBe('https://patcher.xyz/new');
    // Only one canonical link should exist
    const allCanonical = document.querySelectorAll('link[rel="canonical"]');
    expect(allCanonical.length).toBe(1);
    
    TestBed.resetTestingModule();
  });
});