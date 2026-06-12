import { MinimalModule } from './module';
import {
  Privatable,
  Timestamped
} from './models';
import { PublicUser } from './user';

export interface ModuleCollectionSummary extends Timestamped, Privatable {
  id: number;
  authorid: string;
  author: PublicUser;
  name: string;
  description?: string | null;
  image?: string | null;
  public_id: string;
  module_count?: number;
}

export interface ModuleCollectionEntry {
  id: number;
  ordinal: number;
  note?: string | null;
  module: MinimalModule;
}

export interface ModuleCollectionDetail extends ModuleCollectionSummary {
  entries: ModuleCollectionEntry[];
  module_count: number;
}

export interface ModuleCollectionPage {
  items: ModuleCollectionSummary[];
  total: number;
  remaining: number;
}
