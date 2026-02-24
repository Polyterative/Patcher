export interface HomeHeroVisual {
  src: string;
  alt: string;
  caption?: string;
  captionKeywords?: string[];
}

export interface HomeHeroContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  subtitleKeywords?: string[];
  mainVisual: HomeHeroVisual;
  floatingVisualA?: HomeHeroVisual;
  floatingVisualB?: HomeHeroVisual;
  sourceLinkLabel?: string;
  sourceLinkHref?: string;
}

export interface HomePrincipleCard {
  icon: string;
  title: string;
  description: string;
  keywords?: string[];
}

export interface HomeWorkflowStep {
  kicker: string;
  title: string;
  description: string;
  keywords?: string[];
}

export type HomeProofTone =
  'patch'
  | 'module'
  | 'rack';

export type HomeProofKind =
  'patch'
  | 'module'
  | 'rack';

export interface HomeProofSection {
  kind: HomeProofKind;
  kicker: string;
  title: string;
  description: string;
  keywords?: string[];
  tone: HomeProofTone;
}

export interface HomeLinkPill {
  icon: string;
  label: string;
  href: string;
}

export interface HomeFounderNote {
  quote: string;
  author: string;
  role: string;
}
