import { Injectable } from '@angular/core';
import { Title }      from '@angular/platform-browser';
import {
  SeoSocialShareData,
  SeoSocialShareService
}                     from 'ngx-seo';

@Injectable({
  providedIn: 'root'
})
export class SeoAndUtilsService {
  
  constructor(
    private readonly seoSocialShareService: SeoSocialShareService,
    private titleService: Title
  ) { }
  
  private defaults: { image: string; keywords: string; description: string; title: string } = {
    title:       'patcher.xyz',
    description: 'Manager and database for musicians using modular gear, with a focus on saving, and visualizing patch-notes.',
    image:       'https://patcher.xyz/assets/png/patcher_promo_280122 (0)png (Small).png',
    keywords:    'eurorack, modular, tool, modulargrid, patch-notes, utility, database, doepfer, intellijel, makenoise' // seo keywords for google and other search engines
    // ...
  };
  
  updateSeo(data: SeoSocialShareData, appArea: string) {
    
    console.log('updateSeo', data);
    
    this.seoSocialShareService.setData(this.defaults);
    this.seoSocialShareService.setData(data);
    
    const newTitle: string = appArea + ' | ' + this.defaults.title;
    //
    this.titleService.setTitle(newTitle);
    this.seoSocialShareService.setTitle(newTitle);
    
  }
  
  updatePartialSeo(data: SeoSocialShareData) {
    
    console.log('updatePartialSeo', data);
    
    this.seoSocialShareService.setData(data);
    
    
  }
}
