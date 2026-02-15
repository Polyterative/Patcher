/**
 * SEO Social Share Data interface
 * Replaces the ngx-seo SeoSocialShareData interface
 */
export interface SeoSocialShareData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  section?: string;
  published?: string;
  modified?: string;
  keywords?: string;
}