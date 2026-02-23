import { DOCUMENT } from '@angular/common';
import {
  Inject,
  Injectable
} from '@angular/core';
import {
  Meta,
  Title
} from '@angular/platform-browser';
import { SeoSocialShareData } from '../../models/seo.model';


@Injectable({
  providedIn: 'root'
})
export class SeoAndUtilsService {
  
  private defaults: { image: string; keywords: string; description: string; title: string } = {
    title:       'patcher.xyz',
    description: 'Manager and database for musicians using modular gear, with a focus on saving, and visualizing patch-notes.',
    image: 'https://patcher.xyz/assets/png/patcher_seo_hero.png',
    keywords:    'eurorack, modular, tool, modulargrid, patch-notes, utility, database, doepfer, intellijel, makenoise' // seo keywords for google and other search engines
    // ...
  };
  
  constructor(
    private titleService: Title,
    private readonly metaService: Meta,
    @Inject(DOCUMENT) private readonly document: Document,
  ) { }
  
  updateSeo(data: SeoSocialShareData, appArea: string) {
    try {
      const newSeoData = {
        ...this.defaults,
        ...data
      };
      
      const newTitle: string = appArea + ' | ' + this.defaults.title;
      const canonicalUrl = newSeoData.url || this.getCurrentUrl();
      this.setTitle(newTitle);
      this.updateCanonicalLink(canonicalUrl);
      
      // Set basic meta tags
      this.metaService.updateTag({name: 'description', content: newSeoData.description});
      this.metaService.updateTag({name: 'keywords', content: newSeoData.keywords});
      this.metaService.updateTag({name: 'author', content: newSeoData.author || 'patcher.xyz'});
      
      // Open Graph meta tags
      this.metaService.updateTag({property: 'og:title', content: newTitle});
      this.metaService.updateTag({property: 'og:description', content: newSeoData.description});
      this.metaService.updateTag({property: 'og:type', content: newSeoData.type || 'website'});
      this.metaService.updateTag({property: 'og:url', content: canonicalUrl});
      this.metaService.updateTag({property: 'og:image', content: newSeoData.image});
      this.metaService.updateTag({property: 'og:image:secure_url', content: newSeoData.image});
      this.metaService.updateTag({property: 'og:image:width', content: '1200'});
      this.metaService.updateTag({property: 'og:image:height', content: '630'});
      this.metaService.updateTag({property: 'og:image:alt', content: newTitle});
      
      // Twitter Card meta tags
      this.metaService.updateTag({name: 'twitter:card', content: 'summary_large_image'});
      this.metaService.updateTag({name: 'twitter:title', content: newTitle});
      this.metaService.updateTag({name: 'twitter:description', content: newSeoData.description});
      this.metaService.updateTag({name: 'twitter:url', content: canonicalUrl});
      this.metaService.updateTag({name: 'twitter:image', content: newSeoData.image});
      this.metaService.updateTag({name: 'twitter:image:src', content: newSeoData.image});
      this.metaService.updateTag({name: 'twitter:image:alt', content: newTitle});
      
    } catch (error) {
      console.error('Error updating SEO tags:', error);
    }
    
  }
  
  private setTitle(title: string = '') {
    this.titleService.setTitle(title);
    if (title && title.length) {
      this.metaService.updateTag({name: 'twitter:title', content: title});
      this.metaService.updateTag({name: 'twitter:image:alt', content: title});
      this.metaService.updateTag({property: 'og:image:alt', content: title});
      this.metaService.updateTag({property: 'og:title', content: title});
      this.metaService.updateTag({name: 'title', content: title});
    } else {
      this.metaService.removeTag(`name='twitter:title'`);
      this.metaService.removeTag(`name='twitter:image:alt'`);
      this.metaService.removeTag(`property='og:image:alt'`);
      this.metaService.removeTag(`property='og:title'`);
      this.metaService.removeTag(`name='title'`);
    }
  }
  
  private getCurrentUrl(): string {
    return this.document.location?.href || 'https://patcher.xyz/';
  }
  
  private updateCanonicalLink(url: string): void {
    if (!url) {
      return;
    }
    let canonical = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      this.document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
  }
}