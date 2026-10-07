export interface HomeHeroContent {
  eyebrow: string;
  title: string;
  lede: string;
  graphCaption: string;
}

export interface HomeTourShot {
  light: string;
  dark: string;
  alt: string;
}

export interface HomeTourTab {
  id: 'library' | 'racks' | 'patches';
  label: string;
  icon: string;
  title: string;
  description: string;
  points: string[];
  link: {label: string; href: string};
  shot: HomeTourShot;
}

export interface HomeSwitchStep {
  label: string;
  description: string;
}

export interface HomeBenefit {
  icon: string;
  title: string;
  description: string;
}

export interface HomeOpenPillar {
  icon: string;
  title: string;
  description: string;
  link: {label: string; href: string};
}

export interface HomeApiFact {
  icon: string;
  title: string;
  description: string;
}

export interface HomeProofFigure {
  value: string;
  label: string;
}

/** Where on the homepage a CTA lives; sent with `home.cta_clicked`. */
export type HomeCtaLocation = 'hero' | 'proof' | 'tour' | 'switch' | 'api' | 'open' | 'closing';

export interface HomeCtaClick {
  cta: string;
  location: HomeCtaLocation;
}
