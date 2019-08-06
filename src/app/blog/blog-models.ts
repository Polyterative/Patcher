export enum Category {
  'music',
  'code',
  'productivity'
}

export interface BlogPostModel {
  title: string;
  subtitle: string;
  content: string;
  id: number;
  created: string;
  updated: string;
  category: Category;
}
