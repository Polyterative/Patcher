export interface FlagCategoryOption {
  value: string;
  label: string;
  icon: string;
}

export interface FlagCategoryGroup {
  label: string;
  description: string;
  icon: string;
  options: FlagCategoryOption[];
}

export const FLAG_CATEGORY_GROUPS: FlagCategoryGroup[] = [
  {
    label: 'Module details',
    description: 'Name, maker, description, and tags.',
    icon: 'info',
    options: [
      {value: 'wrong-name', label: 'Wrong module name', icon: 'badge'},
      {value: 'wrong-manufacturer', label: 'Wrong manufacturer', icon: 'factory'},
      {value: 'wrong-description', label: 'Wrong description or details', icon: 'description'},
      {value: 'wrong-tags', label: 'Wrong tags / categorization', icon: 'sell'},
    ]
  },
  {
    label: 'Specs and setup',
    description: 'Power, size, depth, and I/O.',
    icon: 'tune',
    options: [
      {value: 'wrong-hp', label: 'Wrong HP / width', icon: 'straighten'},
      {value: 'wrong-power', label: 'Wrong power requirements', icon: 'bolt'},
      {value: 'wrong-depth-weight', label: 'Wrong depth or weight', icon: 'swap_vert'},
      {value: 'wrong-io', label: 'Wrong inputs / outputs / ports', icon: 'input'},
    ]
  },
  {
    label: 'Images and links',
    description: 'Panel image, cropping, and manual link problems.',
    icon: 'image',
    options: [
      {value: 'missing-panel-image', label: 'Missing panel image', icon: 'add_photo_alternate'},
      {value: 'wrong-panel-image', label: 'Wrong panel image', icon: 'broken_image'},
      {value: 'duplicate-panel-image', label: 'Duplicate panel image', icon: 'content_copy'},
      {value: 'panel-image-cropped', label: 'Panel image cropped incorrectly', icon: 'crop'},
      {value: 'missing-manual', label: 'Missing manual link', icon: 'menu_book'},
      {value: 'broken-manual-link', label: 'Broken manual link', icon: 'link_off'},
    ]
  },
  {
    label: 'Catalogue',
    description: 'Duplicates or anything uncategorized.',
    icon: 'inventory_2',
    options: [
      {value: 'duplicate', label: 'Duplicate module', icon: 'content_copy'},
      {value: 'other', label: 'Other', icon: 'more_horiz'},
    ]
  }
] as const;

export const FLAG_CATEGORIES = FLAG_CATEGORY_GROUPS.flatMap(group => group.options);
export type FlagCategory = FlagCategoryOption['value'];

export interface FlagPayload {
  category: FlagCategory;
  note: string;
}
