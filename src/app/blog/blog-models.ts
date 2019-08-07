export enum Category {
  'generic',
  'music',
  'code',
  'productivity'
}

export interface BlogPostModel {
  title: string;
  subtitle: string;
  content: string;
  created: string;
  updated: string;
  slug: string;
  category: Category;
}
