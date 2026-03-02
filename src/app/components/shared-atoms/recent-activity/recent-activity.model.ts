export type RecentActivityType =
  'comment'
  | 'update'
  | 'create'
  | 'listing'
  | 'price'
  | 'generic';

export interface RecentActivityItem {
  id: string;
  type: RecentActivityType;
  actionLabel: string;
  targetLabel: string;
  timestamp: string;
  actorLabel?: string;
  contextLabel?: string;
  route?: string | (string | number)[];
  icon?: string;
}
