import { Injectable } from '@angular/core';
import { MinimalModule } from 'src/app/models/module';


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
export class RackAnalysisService {
  
  /**
   * Analyzes a rack configuration against a user's module collection.
   * Groups modules by standard (3U, 1U, etc.) and provides intelligent recommendations.
   *
   * @param hp - HP per row
   * @param rows - Number of rows
   * @param modules - User's module collection
   * @returns Comprehensive rack analysis with recommendations
   */
  analyzeRackConfiguration(hp: number, rows: number, modules: MinimalModule[]): RackAnalysis {
    const totalCapacity = Number(hp) * Number(rows);
    
    if (modules.length === 0) {
      return {
        totalCapacity,
        moduleCount: 0,
        totalModulesHp: 0,
        utilizationPercent: 0,
        recommendation: 'Standard eurorack case (84 HP × 2 rows)',
        warningMessage: undefined,
        standardAnalyses: [],
        primaryStandard: undefined
      };
    }
    
    // Group modules by standard
    const modulesByStandard = new Map<number, MinimalModule[]>();
    modules.forEach(module => {
      const standardId = module.standard?.id ?? 0;
      if (!modulesByStandard.has(standardId)) {
        modulesByStandard.set(standardId, []);
      }
      modulesByStandard.get(standardId)!.push(module);
    });
    
    // Analyze each standard family
    const standardAnalyses: StandardAnalysis[] = [];
    modulesByStandard.forEach((standardModules, standardId) => {
      const moduleHpValues = standardModules.map(m => m.hp);
      const largestModuleHp = Math.max(...moduleHpValues);
      const totalModulesHp = moduleHpValues.reduce((sum, hp) => sum + hp, 0);
      const canFitLargest = hp >= largestModuleHp;
      
      const standardName = this.getStandardName(standardId);
      
      standardAnalyses.push({
        standardId,
        standardName,
        moduleCount: standardModules.length,
        largestModuleHp,
        totalModulesHp,
        canFitLargest
      });
    });
    
    // Sort by module count (descending) to find the primary standard
    standardAnalyses.sort((a, b) => b.moduleCount - a.moduleCount);
    
    // Primary standard is the one with most modules
    const primaryStandard = standardAnalyses[0];
    
    // Calculate overall stats
    const totalModulesHp = standardAnalyses.reduce((sum, std) => sum + std.totalModulesHp, 0);
    const utilizationPercent = (totalModulesHp / totalCapacity) * 100;
    
    // Calculate minimum rows needed if modules were grouped by standard
    const minRowsNeeded = standardAnalyses.reduce((sum, std) => sum + Math.ceil(std.totalModulesHp / hp), 0);
    
    // Generate intelligent recommendation based on grouped standards
    let recommendation: string;
    let warningMessage: string | undefined = undefined;
    
    // Check for warnings across all standards
    const problematicStandards = standardAnalyses.filter(std => !std.canFitLargest);
    if (problematicStandards.length > 0) {
      const issues = problematicStandards.map(std =>
        `${ std.standardName }: ${ std.largestModuleHp } HP`
      ).join(', ');
      warningMessage = `⚠️ Largest modules won't fit in ${ hp } HP row - ${ issues }`;
      recommendation = `Consider at least ${ Math.max(...problematicStandards.map(s => s.largestModuleHp)) } HP per row`;
    } else if (standardAnalyses.length > 1) {
      // Multiple standards detected - show all groups
      const standardSummary = standardAnalyses
        .map(std => `${ std.moduleCount } × ${ std.standardName }`)
        .join(', ');
      
      if (rows < minRowsNeeded) {
        recommendation = `Consider ${ minRowsNeeded }+ rows to separate ${ standardAnalyses.length } module families`;
      } else if (utilizationPercent > 90) {
        recommendation = `Tightly packed! ${ standardSummary } almost full`;
      } else {
        recommendation = `Good fit for ${ standardSummary } (${ utilizationPercent.toFixed(0) }% full)`;
      }
    } else if (standardAnalyses.length === 1) {
      // Single standard family - use primary (which is the only one)
      const std = primaryStandard;
      const modulesLabel = std.moduleCount === 1 ? 'module' : 'modules';
      
      if (utilizationPercent > 100) {
        const suggestedRows = Math.ceil(std.totalModulesHp / hp);
        recommendation = `All ${ std.moduleCount } ${ std.standardName } ${ modulesLabel } need ${ suggestedRows }+ rows (${ std.totalModulesHp } HP total)`;
      } else if (utilizationPercent > 80) {
        recommendation = `Perfect for your ${ std.moduleCount } ${ std.standardName } ${ modulesLabel } (${ utilizationPercent.toFixed(0) }% full)`;
      } else if (utilizationPercent > 50) {
        recommendation = `Good size for ${ std.moduleCount } ${ std.standardName } ${ modulesLabel } (${ utilizationPercent.toFixed(0) }% full)`;
      } else if (utilizationPercent > 20) {
        recommendation = `Spacious for ${ std.moduleCount } ${ std.standardName } ${ modulesLabel } (${ utilizationPercent.toFixed(0) }% full)`;
      } else {
        recommendation = `Very spacious (${ utilizationPercent.toFixed(0) }% full)`;
      }
    } else {
      // No modules - shouldn't happen but safe fallback
      recommendation = 'Standard eurorack case (84 HP × 2 rows)';
    }
    
    return {
      totalCapacity,
      moduleCount: modules.length,
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
      case 0:
        return '3U Eurorack';
      case 1:
        return 'Intellijel 1U';
      case 2:
        return 'PulpLogic 1U';
      default:
        return 'Unknown';
    }
  }
  
  /**
   * Analyzes a collection of modules to determine groupings by standard.
   * Useful for understanding a user's module collection composition.
   *
   * @param modules - Module collection to analyze
   * @returns Array of standard analyses sorted by module count (descending)
   */
  analyzeModuleCollection(modules: MinimalModule[]): StandardAnalysis[] {
    if (modules.length === 0) {
      return [];
    }
    
    // Group modules by standard
    const modulesByStandard = new Map<number, MinimalModule[]>();
    modules.forEach(module => {
      const standardId = module.standard?.id ?? 0;
      if (!modulesByStandard.has(standardId)) {
        modulesByStandard.set(standardId, []);
      }
      modulesByStandard.get(standardId)!.push(module);
    });
    
    // Analyze each standard family
    const standardAnalyses: StandardAnalysis[] = [];
    modulesByStandard.forEach((standardModules, standardId) => {
      const moduleHpValues = standardModules.map(m => m.hp);
      const largestModuleHp = Math.max(...moduleHpValues);
      const totalModulesHp = moduleHpValues.reduce((sum, hp) => sum + hp, 0);
      
      standardAnalyses.push({
        standardId,
        standardName: this.getStandardName(standardId),
        moduleCount: standardModules.length,
        largestModuleHp,
        totalModulesHp,
        canFitLargest: true // Not applicable without rack context
      });
    });
    
    // Sort by module count (descending)
    standardAnalyses.sort((a, b) => b.moduleCount - a.moduleCount);
    
    return standardAnalyses;
  }
  
  /**
   * Suggests optimal rack dimensions for a given module collection.
   *
   * @param modules - Module collection
   * @returns Suggested HP per row and number of rows
   */
  suggestRackDimensions(modules: MinimalModule[]): {
    hp: number;
    rows: number
  } {
    if (modules.length === 0) {
      return {hp: 84, rows: 2}; // Default eurorack
    }
    
    const standardAnalyses = this.analyzeModuleCollection(modules);
    const primaryStandard = standardAnalyses[0];
    
    // Use the largest module HP as minimum, rounded up to common sizes
    const largestModuleHp = primaryStandard.largestModuleHp;
    const commonSizes = [42, 62, 84, 104, 126, 168, 208];
    const suggestedHp = commonSizes.find(size => size >= largestModuleHp) || 84;
    
    // Calculate rows needed
    const totalHp = standardAnalyses.reduce((sum, std) => sum + std.totalModulesHp, 0);
    const minRows = Math.ceil(totalHp / suggestedHp);
    
    // Add some breathing room (20% extra capacity)
    const suggestedRows = Math.min(10, Math.ceil(minRows * 1.2));
    
    return {hp: suggestedHp, rows: suggestedRows};
  }
}