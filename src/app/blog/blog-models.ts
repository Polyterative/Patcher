export enum Category {
  'generic',
  'music',
  'code',
  'productivity'
}

export const CategoryColors = {
  [Category.generic]:      '#4d5a4e',
  [Category.music]:        '#2c5a42',
  [Category.code]:         '#1a4a5a',
  [Category.productivity]: '#5a3727'
};

export const CategoryNames = {
  [Category.generic]:      'Generic',
  [Category.music]:        'Music',
  [Category.code]:         'Code',
  [Category.productivity]: 'Productivity'
};


export interface BlogEntryModel {
  title: string;
  subtitle: string;
  content: string;
  created: string;
  updated: string;
  slug: string;
  category: Category;
  public: boolean;
  image?: string;
}
