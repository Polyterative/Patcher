import { AdminFlagRow } from 'src/app/features/backend/supabase-get';
import {
  FLAG_CATEGORY_GROUPS,
  FlagCategoryOption
} from 'src/app/components/module-parts/module-flag/module-flag-data.types';

export type { AdminFlagRow };
export type FlagStatusFilter = 'all' | 'open' | 'resolved';

export interface AdminFlagViewRow extends AdminFlagRow {
  reporterName: string | null;
}

export interface AdminFlagCategoryOption extends FlagCategoryOption {
  groupLabel: string;
}

export interface AdminFlagCategoryGroup {
  label: string;
  options: AdminFlagCategoryOption[];
}

export const LEGACY_FLAG_CATEGORY_GROUPS: AdminFlagCategoryGroup[] = [
  {
    label: 'Legacy categories',
    options: [
      {value: 'wrong-specs', label: 'Wrong specs', icon: 'tune', groupLabel: 'Legacy categories'},
      {value: 'missing-image', label: 'Missing image', icon: 'image', groupLabel: 'Legacy categories'}
    ]
  }
];

export const ADMIN_FLAG_CATEGORY_GROUPS: AdminFlagCategoryGroup[] = [
  ...FLAG_CATEGORY_GROUPS.map(group => ({
    label: group.label,
    options: group.options.map(option => ({
      ...option,
      groupLabel: group.label
    }))
  })),
  ...LEGACY_FLAG_CATEGORY_GROUPS
];

export const ADMIN_FLAG_CATEGORY_OPTIONS = ADMIN_FLAG_CATEGORY_GROUPS.flatMap(group => group.options);
export const ADMIN_FLAG_CATEGORY_MAP = new Map(
  ADMIN_FLAG_CATEGORY_OPTIONS.map(option => [option.value, option])
);
