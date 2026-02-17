import { Injectable } from '@angular/core';
import { MinimalModule } from 'src/app/models/module';


/**
 * Constants for Eurorack module standards
 */
export const STANDARDS = {
  EURORACK_3U: {
    id: 0,
    name: '3U Eurorack'
  },
  INTELLIJEL_1U: {
    id: 1,
    name: 'Intellijel 1U'
  },
  PULPLOGIC_1U: {
    id: 2,
    name: 'PulpLogic 1U'
  }
} as const;

export interface StandardAnalysis {
  standardId: number;
  standardName: string;
  moduleCount: number;
  largestModuleHp: number;
  totalModulesHp: number;
  canFitLargest: boolean;
}

export interface RackAnalysis {
  totalCapacity: number;
  moduleCount: number;
  totalModulesHp: number;
  utilizationPercent: number;
  recommendation: string;
  warningMessage?: string;
  standardAnalyses: StandardAnalysis[];
  primaryStandard?: StandardAnalysis;
}

@Injectable({
  providedIn: 'root'
})
export class ModuleCollectionAnalysisService {
  
  /**
   * Filters a module collection to only include specified standard(s).
   * Useful for components that only care about specific module types (e.g., only 3U).
   *
   * @param modules - Module collection to filter (can be null/undefined)
   * @param standardIds - Standard ID(s) to include (e.g., [0] for 3U only)
   * @returns Filtered module array
   */
  filterModulesByStandard(
    modules: MinimalModule[] | null | undefined,
    standardIds: number | number[]
  ): MinimalModule[] {
    const validModules = modules || [];
    const idsArray = Array.isArray(standardIds) ? standardIds : [standardIds];
    
    return validModules.filter(m => {
      if (!m) return false;
      const moduleStandardId = m.standard?.id ?? STANDARDS.EURORACK_3U.id;
      return idsArray.includes(moduleStandardId);
    });
  }
  
  /**
   * Calculates the actual number of rows needed to fit modules using First Fit Decreasing bin packing.
   * This is more accurate than naive division because modules have discrete widths.
   *
   * @param modules - Module collection to pack
   * @param hpPerRow - HP capacity per row
   * @returns Actual number of rows needed
   */
  private calculateRequiredRows(modules: MinimalModule[], hpPerRow: number): number {
    if (modules.length === 0 || hpPerRow <= 0) {
      return 0;
    }
    
    // Filter out null/undefined modules and those with invalid HP values
    const validModules = modules.filter(m => m && typeof m.hp === 'number' && m.hp > 0);
    
    if (validModules.length === 0) {
      return 0;
    }
    
    // Sort modules by HP (largest first) for better packing efficiency
    const sortedModules = [...validModules].sort((a, b) => {
      const hpA = a.hp || 0;
      const hpB = b.hp || 0;
      return hpB - hpA;
    });
    
    // First Fit Decreasing algorithm
    const rows: number[] = [];
    
    for (const module of sortedModules) {
      const moduleHp = module.hp || 0;
      
      // Skip invalid modules
      if (moduleHp <= 0 || moduleHp > hpPerRow) {
        continue;
      }
      
      // Try to fit in existing row
      let placed = false;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i] + moduleHp <= hpPerRow) {
          rows[i] += moduleHp;
          placed = true;
          break;
        }
      }
      
      // If no existing row works, create new row
      if (!placed) {
        rows.push(moduleHp);
      }
    }
    
    return rows.length;
  }

  /**
   * Groups modules by their standard ID.
   *
   * @param modules - Module collection to group
   * @returns Map of standard IDs to their modules
   */
  private groupModulesByStandard(modules: MinimalModule[]): Map<number, MinimalModule[]> {
    const modulesByStandard = new Map<number, MinimalModule[]>();
    
    modules.forEach(module => {
      // Guard against malformed module data
      if (!module) return;
      
      const standardId = module.standard?.id ?? STANDARDS.EURORACK_3U.id;
      if (!modulesByStandard.has(standardId)) {
        modulesByStandard.set(standardId, []);
      }
      modulesByStandard.get(standardId)!.push(module);
    });
    
    return modulesByStandard;
  }
  
  /**
   * Builds a StandardAnalysis object for a group of modules from the same standard.
   *
   * @param standardModules - Modules belonging to the same standard
   * @param standardId - The standard ID
   * @param rowHp - Optional HP per row for canFitLargest calculation
   * @returns StandardAnalysis object or null if invalid data
   */
  private buildStandardAnalysis(
    standardModules: MinimalModule[],
    standardId: number,
    rowHp?: number
  ): StandardAnalysis | null {
    // Guard against empty arrays
    if (standardModules.length === 0) return null;
    
    const moduleHpValues = standardModules
      .filter(m => m && typeof m.hp === 'number' && m.hp > 0)
      .map(m => m.hp);
    
    // Skip if no valid HP values
    if (moduleHpValues.length === 0) return null;
    
    const largestModuleHp = Math.max(...moduleHpValues);
    const totalModulesHp = moduleHpValues.reduce((sum, hp) => sum + hp, 0);
    const canFitLargest = rowHp !== undefined ? rowHp >= largestModuleHp : true;
    
    return {
      standardId,
      standardName: this.getStandardName(standardId),
      moduleCount: moduleHpValues.length,
      largestModuleHp,
      totalModulesHp,
      canFitLargest
    };
  }
  
  /**
   * Analyzes modules grouped by standard and returns sorted analysis results.
   *
   * @param modules - Module collection to analyze
   * @param rowHp - Optional HP per row for canFitLargest calculation
   * @returns Sorted array of standard analyses (by module count, descending)
   */
  private performStandardAnalysis(modules: MinimalModule[], rowHp?: number): StandardAnalysis[] {
    const modulesByStandard = this.groupModulesByStandard(modules);
    
    const standardAnalyses: StandardAnalysis[] = [];
    modulesByStandard.forEach((standardModules, standardId) => {
      const analysis = this.buildStandardAnalysis(standardModules, standardId, rowHp);
      if (analysis) {
        standardAnalyses.push(analysis);
      }
    });
    
    // Sort by module count (descending)
    return standardAnalyses.sort((a, b) => b.moduleCount - a.moduleCount);
  }
  
  /**
   * Analyzes a rack configuration against a user's module collection.
   * Groups modules by standard (3U, 1U, etc.) and provides intelligent recommendations.
   *
   * This service is agnostic - it analyzes whatever modules are passed to it.
   * Callers should filter modules by standard if needed (e.g., only 3U for eurorack cases).
   *
   * This is a pure function with no side effects - safe to use across login/logout.
   *
   * @param hp - HP per row
   * @param rows - Number of rows
   * @param modules - User's module collection (can be null/undefined)
   * @returns Comprehensive rack analysis with recommendations
   */
  analyzeRackConfiguration(hp: number, rows: number, modules: MinimalModule[] | null | undefined): RackAnalysis {
    // Validate inputs
    const validHp = Number(hp) || 84;
    const validRows = Number(rows) || 2;
    const validModules = modules || [];
    
    const totalCapacity = validHp * validRows;
    
    if (validModules.length === 0) {
      return {
        totalCapacity,
        moduleCount: 0,
        totalModulesHp: 0,
        utilizationPercent: 0,
        recommendation: 'Standard eurorack configuration',
        warningMessage: undefined,
        standardAnalyses: [],
        primaryStandard: undefined
      };
    }
    
    // Perform standard analysis with HP constraint for canFitLargest
    const standardAnalyses = this.performStandardAnalysis(validModules, validHp);
    
    // Primary standard is the one with most modules (if any exist)
    const primaryStandard = standardAnalyses.length > 0 ? standardAnalyses[0] : undefined;
    
    // Calculate overall stats
    const totalModulesHp = standardAnalyses.reduce((sum, std) => sum + std.totalModulesHp, 0);
    const moduleCount = standardAnalyses.reduce((sum, std) => sum + std.moduleCount, 0);
    const utilizationPercent = totalCapacity > 0 ? (totalModulesHp / totalCapacity) * 100 : 0;
    
    // Check if modules can actually be packed (considering discrete widths)
    const actualRowsNeeded = this.calculateRequiredRows(validModules, validHp);
    const modulesFit = actualRowsNeeded <= validRows;
    
    // Generate intelligent recommendation based on grouped standards
    let recommendation: string;
    let warningMessage: string | undefined = undefined;
    
    // Check for informational notes across all standards
    const problematicStandards = standardAnalyses.filter(std => !std.canFitLargest);
    const moduleLabel = moduleCount === 1 ? 'module' : 'modules';
    
    if (problematicStandards.length > 0) {
      const largestHp = Math.max(...problematicStandards.map(s => s.largestModuleHp));
      warningMessage = `⚠️ Some modules won't fit: largest is ${ largestHp } HP, rows are ${ validHp } HP`;
      recommendation = `You'd need at least ${ largestHp } HP per row to fit all modules`;
    } else if (!modulesFit) {
      // Modules don't fit due to packing constraints
      recommendation = `You'd need ${ actualRowsNeeded } rows to fit all ${ moduleCount } ${ moduleLabel }`;
    } else if (actualRowsNeeded === validRows) {
      recommendation = `Perfect fit for your ${ moduleCount } ${ moduleLabel }`;
    } else if (utilizationPercent > 80) {
      recommendation = `Perfect fit for most of your ${ moduleCount } ${ moduleLabel }`;
    } else if (utilizationPercent > 50) {
      recommendation = `Comfortable fit for your ${ moduleCount } ${ moduleLabel }`;
    } else {
      recommendation = `Plenty of room for your ${ moduleCount } ${ moduleLabel }`;
    }
    
    return {
      totalCapacity,
      moduleCount,
      totalModulesHp,
      utilizationPercent,
      recommendation,
      warningMessage,
      standardAnalyses,
      primaryStandard
    };
  }
  
  /**
   * Gets the human-readable name for a module standard ID.
   *
   * @param standardId - The standard ID (0 = 3U, 1 = Intellijel 1U, 2 = PulpLogic 1U)
   * @returns Human-readable standard name
   */
  getStandardName(standardId: number): string {
    switch (standardId) {
      case STANDARDS.EURORACK_3U.id:
        return STANDARDS.EURORACK_3U.name;
      case STANDARDS.INTELLIJEL_1U.id:
        return STANDARDS.INTELLIJEL_1U.name;
      case STANDARDS.PULPLOGIC_1U.id:
        return STANDARDS.PULPLOGIC_1U.name;
      default:
        return 'Unknown';
    }
  }
  
  /**
   * Analyzes a collection of modules to determine groupings by standard.
   * Useful for understanding a user's module collection composition.
   *
   * This is a pure function with no side effects - safe to use across login/logout.
   *
   * @param modules - Module collection to analyze (can be null/undefined)
   * @returns Array of standard analyses sorted by module count (descending)
   */
  analyzeModuleCollection(modules: MinimalModule[] | null | undefined): StandardAnalysis[] {
    const validModules = modules || [];
    
    if (validModules.length === 0) {
      return [];
    }
    
    return this.performStandardAnalysis(validModules);
  }
  
  /**
   * Suggests optimal rack dimensions for a given module collection.
   *
   * This is a pure function with no side effects - safe to use across login/logout.
   *
   * @param modules - Module collection (can be null/undefined)
   * @returns Suggested HP per row and number of rows
   */
  suggestRackDimensions(modules: MinimalModule[] | null | undefined): {
    hp: number;
    rows: number
  } {
    const validModules = modules || [];
    
    if (validModules.length === 0) {
      return {hp: 84, rows: 2}; // Default eurorack
    }
    
    const standardAnalyses = this.analyzeModuleCollection(validModules);
    
    // Guard against no valid analyses
    if (standardAnalyses.length === 0) {
      return {hp: 84, rows: 2};
    }
    
    const primaryStandard = standardAnalyses[0];
    
    // Use the largest module HP as minimum, rounded up to common sizes
    const largestModuleHp = primaryStandard.largestModuleHp;
    const commonSizes = [42, 62, 84, 104, 126, 168, 208];
    const suggestedHp = commonSizes.find(size => size >= largestModuleHp) || 84;
    
    // Calculate rows needed using proper bin packing
    const minRows = this.calculateRequiredRows(validModules, suggestedHp);
    
    // Add some breathing room (20% extra capacity, at least 1 extra row)
    const suggestedRows = Math.min(10, Math.max(minRows + 1, Math.ceil(minRows * 1.2)));
    
    return {hp: suggestedHp, rows: suggestedRows};
  }
}