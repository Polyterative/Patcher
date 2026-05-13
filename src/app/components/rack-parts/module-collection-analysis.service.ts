import { Injectable } from '@angular/core';
import { MinimalModule } from 'src/app/models/module';
import {
  RackAnalysis,
  StandardAnalysis
} from './module-collection-analysis.models';
import {
  analyzeModuleCollection,
  analyzeRackConfiguration,
  filterModulesByStandard,
  getStandardName,
  suggestRackDimensions
} from './module-collection-analysis.utils';

export type { RackAnalysis, StandardAnalysis } from './module-collection-analysis.models';
export { STANDARDS } from './module-collection-analysis.constants';

@Injectable({
  providedIn: 'root'
})
export class ModuleCollectionAnalysisService {

  filterModulesByStandard(
    modules: MinimalModule[] | null | undefined,
    standardIds: number | number[]
  ): MinimalModule[] {
    return filterModulesByStandard(modules, standardIds);
  }

  analyzeRackConfiguration(hp: number, rows: number, modules: MinimalModule[] | null | undefined): RackAnalysis {
    return analyzeRackConfiguration(hp, rows, modules);
  }

  getStandardName(standardId: number): string {
    return getStandardName(standardId);
  }

  analyzeModuleCollection(modules: MinimalModule[] | null | undefined): StandardAnalysis[] {
    return analyzeModuleCollection(modules);
  }

  suggestRackDimensions(modules: MinimalModule[] | null | undefined): { hp: number; rows: number } {
    return suggestRackDimensions(modules);
  }
}
