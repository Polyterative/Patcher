export enum Category {
    'generic',
    'music',
    'code',
    'productivity'
}

export const CATEGORY_COLORS = {
    [Category.generic]:      'rgb(116,135,117)',
    [Category.music]:        'rgb(58,119,88)',
    [Category.code]:         'rgb(38,107,130)',
    [Category.productivity]: 'rgb(136,83,59)'
};

export const CATEGORY_NAMES = {
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

export interface InstagramLinkModel {
    title: string;
    path: string;
}
