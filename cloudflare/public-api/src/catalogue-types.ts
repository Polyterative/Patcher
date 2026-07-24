export type SortMode = 'name' | 'id';
export type ModuleInclude = 'ins' | 'outs' | 'panels' | 'tags';

export interface CursorToken {
  v: 1;
  s: string | number;
  id: number;
}

export interface ListPage<T> {
  data: T[];
  page: { next_cursor: string | null };
}

export interface ListOptions {
  cursor: CursorToken | null;
  fields: string[] | null;
  limit: number;
  sort: SortMode;
}

export interface ModuleListOptions extends ListOptions {
  filters: {
    hp: number | null;
    manufacturerId: number | null;
    standard: number | null;
    tag: number | null;
  };
  include: ModuleInclude[];
}

export interface ModuleDetailOptions {
  fields: string[] | null;
  include: ModuleInclude[];
}

export interface ManufacturerListOptions extends ListOptions {}

export interface ManufacturerDetailOptions {
  fields: string[] | null;
  includeModules: boolean;
}

export interface ReferenceListOptions extends ListOptions {}

export interface PublicModule {
  id: number;
  name: string;
  description: string | null;
  hp: number | null;
  standard: number | null;
  manufacturer_id: number | null;
  depth: number | null;
  depth_max: number | null;
  is_diy: boolean | null;
  manual_url: string | null;
  power_neg_12: number | null;
  power_pos_12: number | null;
  power_pos_5: number | null;
  switches: PublicSwitch[] | null;
  weight: number | null;
  ins?: PublicPort[];
  outs?: PublicPort[];
  tags?: PublicTag[];
  panels?: PublicPanel[];
}

export interface PublicModuleSummary extends Omit<PublicModule, 'ins' | 'outs' | 'tags' | 'panels'> {}

export interface PublicPort {
  id: number;
  name: string;
  is_audio: boolean | null;
  is_dcc: boolean | null;
  is_voct: boolean | null;
  min: number | null;
  max: number | null;
}

export interface PublicTag {
  id: number;
  name: string;
  type: string | null;
}

export interface PublicPanel {
  id: number;
  color: string | null;
  description: string | null;
}

export interface PublicSwitch {
  name: string;
  positions: string[];
}

export interface PublicManufacturer {
  id: number;
  name: string;
  description: string | null;
  tagline: string | null;
  website_url: string | null;
  social_links: unknown;
  logo: string | null;
  modules?: PublicModuleSummary[];
}

export interface PublicStandard {
  id: number;
  name: string;
}

export interface CatalogueProvider {
  listModules(options: ModuleListOptions): Promise<ListPage<PublicModule>>;
  getModule(id: number, options: ModuleDetailOptions): Promise<PublicModule | null>;
  listManufacturers(options: ManufacturerListOptions): Promise<ListPage<PublicManufacturer>>;
  getManufacturer(id: number, options: ManufacturerDetailOptions): Promise<PublicManufacturer | null>;
  listStandards(options: ReferenceListOptions): Promise<ListPage<PublicStandard>>;
  listTags(options: ReferenceListOptions): Promise<ListPage<PublicTag>>;
}
