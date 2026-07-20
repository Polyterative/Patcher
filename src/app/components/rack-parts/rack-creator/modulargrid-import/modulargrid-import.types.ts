import { MinimalModule } from 'src/app/models/module';

export type ModularGridParseStatus = 'empty' | 'invalid-json' | 'wrong-shape' | 'valid';

export interface ModularGridRackExportInfo {
  name: string;
  rows: number;
  hp: number;
  format?: string;
  rows1u: number[];
}

export interface ModularGridSourceModule {
  key: string;
  mgId: string | number | null;
  name: string;
  row: number;
  col: number;
  inferredHp: number;
}

export interface ModularGridParseResult {
  status: ModularGridParseStatus;
  error?: 'invalid-json' | 'wrong-shape';
  rack?: ModularGridRackExportInfo;
  modules: ModularGridSourceModule[];
  warnings: string[];
}

export interface ModularGridCandidate {
  module: MinimalModule;
  score: number;
  nameScore: number;
  hpScore: number;
}

export type ModularGridMatchBucket = 'confident' | 'likely' | 'ambiguous' | 'unmatched' | 'blank';

export interface ModularGridMatchedModule {
  source: ModularGridSourceModule;
  bucket: ModularGridMatchBucket;
  candidates: ModularGridCandidate[];
}

export interface ModularGridMatchPreview {
  rack: ModularGridRackExportInfo;
  confident: ModularGridMatchedModule[];
  likely: ModularGridMatchedModule[];
  ambiguous: ModularGridMatchedModule[];
  unmatched: ModularGridMatchedModule[];
  blank: ModularGridMatchedModule[];
  counts: Record<ModularGridMatchBucket, number>;
}

export interface ModularGridRackModulePlacement {
  moduleId: number;
  row: number;
  column: number;
  sourceKey: string;
}

export interface ModularGridResolvedPlacementSummary {
  placements: ModularGridRackModulePlacement[];
  skipped: number;
  allAmbiguousResolved: boolean;
}
