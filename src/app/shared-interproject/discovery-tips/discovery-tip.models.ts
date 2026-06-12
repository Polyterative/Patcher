export interface DiscoveryTipUserAreaSnapshot {
  modulesLoaded: boolean;
  racksLoaded: boolean;
  patchesLoaded: boolean;
  manualsLoaded: boolean;
  commentsLoaded: boolean;
  modulesCount: number;
  racksCount: number;
  patchesCount: number;
  manualsCount: number;
  commentsCount: number;
  totalCount: number;
  hasSearchQuery: boolean;
}

export interface DiscoveryTipContextSnapshot {
  currentRoute: string;
  isLoggedIn: boolean;
  viewerKey: string;
  sessionActions: Record<string, number>;
  userArea: DiscoveryTipUserAreaSnapshot;
}

export type DiscoveryTipPreferredSide = 'auto' | 'above' | 'below';
export type DiscoveryTipTargetKind = 'element' | 'section-start' | 'action';

export interface DiscoveryTipPlacement {
  preferredSide?: DiscoveryTipPreferredSide;
  targetKind?: DiscoveryTipTargetKind;
}

export interface DiscoveryTipStateRecord {
  version: number;
  shownCount: number;
  lastShownAt?: string;
  snoozedUntil?: string;
  learnedAt?: string;
}

export interface DiscoveryTipDefinition {
  id: string;
  version: number;
  anchorId: string;
  title: string;
  body: string;
  reason?: string | ((snapshot: DiscoveryTipContextSnapshot) => string);
  placement?: DiscoveryTipPlacement;
  guidedTourOrder?: number;
  routePrefixes: string[];
  priority: number;
  audience: 'all' | 'signed-in';
  displayDelayMs?: number;
  maxShowCount?: number;
  snoozeDurationMs?: number;
  completionActions?: string[];
  isEligible: (snapshot: DiscoveryTipContextSnapshot) => boolean;
}

export interface DiscoveryTipActive {
  definition: DiscoveryTipDefinition;
  anchorElement: HTMLElement;
  reason?: string;
  guidedStepIndex?: number;
  guidedStepTotal?: number;
}

export interface DiscoveryTipStorageShape {
  viewers: Record<string, Record<string, DiscoveryTipStateRecord>>;
}

export const defaultDiscoveryTipUserAreaSnapshot: DiscoveryTipUserAreaSnapshot = {
  modulesLoaded: false,
  racksLoaded: false,
  patchesLoaded: false,
  manualsLoaded: false,
  commentsLoaded: false,
  modulesCount: 0,
  racksCount: 0,
  patchesCount: 0,
  manualsCount: 0,
  commentsCount: 0,
  totalCount: 0,
  hasSearchQuery: false,
};
