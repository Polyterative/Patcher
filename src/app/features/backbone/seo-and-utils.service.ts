import { Injectable } from '@angular/core';
import {
  Meta,
  Title
} from '@angular/platform-browser';
import {
  SeoSocialShareData,
  SeoSocialShareService
} from 'ngx-seo';


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
    private readonly seoSocialShareService: SeoSocialShareService,
    private titleService: Title,
    private readonly metaService: Meta,
  ) { }
  
  updateSeo(data: SeoSocialShareData, appArea: string) {
    try {
      const newSeoData = {
        ...this.defaults,
        ...data
      };
      
      this.seoSocialShareService.setData(newSeoData);
      
      const newTitle: string = appArea + ' | ' + this.defaults.title;
      this.setTitle(newTitle);
      
      // Add more meta tags
      this.metaService.updateTag({property: 'og:description', content: newSeoData.description});
      this.metaService.updateTag({property: 'og:type', content: 'website'});
      this.metaService.updateTag({property: 'og:url', content: window.location.href});
      this.metaService.updateTag({name: 'twitter:description', content: newSeoData.description});
      this.metaService.updateTag({name: 'twitter:card', content: 'summary_large_image'});
      this.metaService.updateTag({name: 'twitter:image', content: newSeoData.image});
      this.metaService.updateTag({name: 'twitter:image:src', content: newSeoData.image});
      this.metaService.updateTag({name: 'twitter:image:alt', content: newSeoData.title});
      this.metaService.updateTag({property: 'og:image', content: newSeoData.image});
      this.metaService.updateTag({property: 'og:image:secure_url', content: newSeoData.image});
      this.metaService.updateTag({property: 'og:image:alt', content: newSeoData.title});
      
    } catch (error) {
      console.error('Error updating SEO tags:', error);
    }
    
  }
  
  private setTitle(title: string = '') {
    this.titleService.setTitle(title);
    this.seoSocialShareService.setTitle(title);
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
}