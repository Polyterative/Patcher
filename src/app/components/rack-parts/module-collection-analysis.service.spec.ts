import { TestBed } from '@angular/core/testing';
import { ModuleCollectionAnalysisService } from './module-collection-analysis.service';
import { MinimalModule } from 'src/app/models/module';


describe('ModuleCollectionAnalysisService - Login/Logout Safety', () => {
  let service: ModuleCollectionAnalysisService;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ModuleCollectionAnalysisService]
    });
    service = TestBed.inject(ModuleCollectionAnalysisService);
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  describe('Login/Logout Scenarios', () => {
    it('should handle null modules array (logged out state)', () => {
      const result = service.analyzeRackConfiguration(84, 2, null);
      
      expect(result).toBeTruthy();
      expect(result.moduleCount).toBe(0);
      expect(result.recommendation).toContain('Standard eurorack');
      expect(result.warningMessage).toBeUndefined();
    });
    
    it('should handle undefined modules array (logged out state)', () => {
      const result = service.analyzeRackConfiguration(84, 2, undefined);
      
      expect(result).toBeTruthy();
      expect(result.moduleCount).toBe(0);
      expect(result.totalCapacity).toBe(168);
    });
    
    it('should handle empty modules array (fresh login)', () => {
      const result = service.analyzeRackConfiguration(84, 2, []);
      
      expect(result).toBeTruthy();
      expect(result.moduleCount).toBe(0);
      expect(result.standardAnalyses).toEqual([]);
      expect(result.primaryStandard).toBeUndefined();
    });
    
    it('should handle invalid HP values', () => {
      const result = service.analyzeRackConfiguration(0, 2, []);
      
      expect(result).toBeTruthy();
      // Service defaults 0 to 84 HP (invalid input protection)
      expect(result.totalCapacity).toBe(168); // 84 * 2
      expect(result.utilizationPercent).toBe(0);
    });
    
    it('should handle malformed module data', () => {
      const badModules = [
        null as any,
        undefined as any,
        {hp: null} as any,
        {hp: -5} as any,
        {hp: 8, standard: {id: 0, name: '3U'}} as MinimalModule
      ];
      
      const result = service.analyzeRackConfiguration(84, 2, badModules);
      
      expect(result).toBeTruthy();
      expect(result.moduleCount).toBe(1); // Only counts valid modules with HP > 0
      expect(result.standardAnalyses.length).toBe(1); // All valid modules grouped under standard 0
      // moduleCount should only count valid modules (those with valid HP)
      expect(result.standardAnalyses[0].moduleCount).toBe(1); // Only the valid module
      expect(result.standardAnalyses[0].totalModulesHp).toBe(8);
      expect(result.standardAnalyses[0].largestModuleHp).toBe(8);
    });
    
    it('should produce consistent results with same input (stateless)', () => {
      const modules: MinimalModule[] = [
        {
          id: 1,
          hp: 8,
          standard: {id: 0, name: '3U Eurorack'}
        } as MinimalModule
      ];
      
      const result1 = service.analyzeRackConfiguration(84, 2, modules);
      const result2 = service.analyzeRackConfiguration(84, 2, modules);
      
      expect(result1).toEqual(result2);
    });
    
    it('should not leak state between calls (pure function)', () => {
      const modules1: MinimalModule[] = [
        {id: 1, hp: 8, standard: {id: 0, name: '3U'}} as MinimalModule
      ];
      
      const modules2: MinimalModule[] = [
        {id: 2, hp: 16, standard: {id: 1, name: '1U'}} as MinimalModule
      ];
      
      service.analyzeRackConfiguration(84, 2, modules1);
      const result2 = service.analyzeRackConfiguration(84, 2, modules2);
      
      // Should only see modules2 data, not modules1
      expect(result2.moduleCount).toBe(1);
      expect(result2.standardAnalyses[0].standardId).toBe(1);
    });
  });
  
  describe('analyzeModuleCollection - Login/Logout Safety', () => {
    it('should handle null input', () => {
      const result = service.analyzeModuleCollection(null);
      expect(result).toEqual([]);
    });
    
    it('should handle undefined input', () => {
      const result = service.analyzeModuleCollection(undefined);
      expect(result).toEqual([]);
    });
    
    it('should handle empty array', () => {
      const result = service.analyzeModuleCollection([]);
      expect(result).toEqual([]);
    });
  });
  
  describe('suggestRackDimensions - Login/Logout Safety', () => {
    it('should handle null input', () => {
      const result = service.suggestRackDimensions(null);
      expect(result).toEqual({hp: 84, rows: 2});
    });
    
    it('should handle undefined input', () => {
      const result = service.suggestRackDimensions(undefined);
      expect(result).toEqual({hp: 84, rows: 2});
    });
    
    it('should handle empty array', () => {
      const result = service.suggestRackDimensions([]);
      expect(result).toEqual({hp: 84, rows: 2});
    });
  });
  
  describe('filterModulesByStandard', () => {
    it('should filter to only 3U modules when given standard ID 0', () => {
      const modules: MinimalModule[] = [
        {id: 1, hp: 8, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
        {id: 2, hp: 10, standard: {id: 1, name: 'Intellijel 1U'}} as MinimalModule,
        {id: 3, hp: 6, standard: {id: 2, name: 'PulpLogic 1U'}} as MinimalModule,
      ];
      
      const result = service.filterModulesByStandard(modules, 0);
      
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });
    
    it('should filter to multiple standards when given array of IDs', () => {
      const modules: MinimalModule[] = [
        {id: 1, hp: 8, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
        {id: 2, hp: 10, standard: {id: 1, name: 'Intellijel 1U'}} as MinimalModule,
        {id: 3, hp: 6, standard: {id: 2, name: 'PulpLogic 1U'}} as MinimalModule,
        {id: 4, hp: 4, standard: {id: 1, name: 'Intellijel 1U'}} as MinimalModule,
      ];
      
      const result = service.filterModulesByStandard(modules, [0, 1]);
      
      expect(result.length).toBe(3);
      expect(result.find(m => m.id === 1)).toBeTruthy();
      expect(result.find(m => m.id === 2)).toBeTruthy();
      expect(result.find(m => m.id === 4)).toBeTruthy();
      expect(result.find(m => m.id === 3)).toBeUndefined();
    });
    
    it('should handle null/undefined input', () => {
      expect(service.filterModulesByStandard(null, 0)).toEqual([]);
      expect(service.filterModulesByStandard(undefined, 0)).toEqual([]);
    });
    
    it('should handle modules without standard (defaults to 0)', () => {
      const modules = [
        {id: 1, hp: 8} as any, // No standard property
      ];
      
      const result = service.filterModulesByStandard(modules, 0);
      
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });
    
    it('should handle malformed modules in filter', () => {
      const modules = [
        null as any,
        undefined as any,
        {id: 1, hp: 8, standard: {id: 0, name: '3U'}} as MinimalModule,
      ];
      
      const result = service.filterModulesByStandard(modules, 0);
      
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
    });
  });
  
  describe('Core Functionality', () => {
    it('should group modules by different standards', () => {
      const modules: MinimalModule[] = [
        {id: 1, hp: 8, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
        {id: 2, hp: 10, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
        {id: 3, hp: 6, standard: {id: 1, name: 'Intellijel 1U'}} as MinimalModule,
        {id: 4, hp: 4, standard: {id: 2, name: 'PulpLogic 1U'}} as MinimalModule,
      ];
      
      const result = service.analyzeRackConfiguration(84, 3, modules);
      
      expect(result.standardAnalyses.length).toBe(3);
      
      // Should be sorted by module count (descending)
      expect(result.standardAnalyses[0].standardId).toBe(0); // 2 modules
      expect(result.standardAnalyses[0].moduleCount).toBe(2);
      expect(result.standardAnalyses[0].totalModulesHp).toBe(18);
      
      expect(result.standardAnalyses[1].moduleCount).toBe(1);
      expect(result.standardAnalyses[2].moduleCount).toBe(1);
    });
    
    it('should generate warning when largest module does not fit', () => {
      const modules: MinimalModule[] = [
        {id: 1, hp: 100, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
      ];
      
      const result = service.analyzeRackConfiguration(84, 2, modules);
      
      expect(result.warningMessage).toBeTruthy();
      expect(result.warningMessage).toContain('⚠️');
      expect(result.warningMessage).toContain('100 HP');
      expect(result.recommendation).toContain('100 HP per row');
    });
    
    it('should calculate utilization percentage correctly', () => {
      const modules: MinimalModule[] = [
        {id: 1, hp: 42, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
      ];
      
      const result = service.analyzeRackConfiguration(84, 2, modules); // 168 total capacity
      
      expect(result.totalCapacity).toBe(168);
      expect(result.totalModulesHp).toBe(42);
      expect(result.utilizationPercent).toBe(25); // 42/168 = 25%
    });
    
    it('should provide appropriate recommendation for high utilization', () => {
      const modules: MinimalModule[] = [
        {id: 1, hp: 70, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
        {id: 2, hp: 70, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
      ];
      
      const result = service.analyzeRackConfiguration(84, 2, modules); // 140/168 = 83%
      
      expect(result.utilizationPercent).toBeGreaterThan(80);
      expect(result.recommendation).toContain('Perfect');
    });
    
    it('should identify primary standard as the one with most modules', () => {
      const modules: MinimalModule[] = [
        {id: 1, hp: 8, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
        {id: 2, hp: 10, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
        {id: 3, hp: 10, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
        {id: 4, hp: 6, standard: {id: 1, name: 'Intellijel 1U'}} as MinimalModule,
      ];
      
      const result = service.analyzeRackConfiguration(84, 2, modules);
      
      expect(result.primaryStandard).toBeTruthy();
      expect(result.primaryStandard!.standardId).toBe(0);
      expect(result.primaryStandard!.moduleCount).toBe(3);
    });
    
    it('should map standard IDs to names correctly', () => {
      expect(service.getStandardName(0)).toBe('3U Eurorack');
      expect(service.getStandardName(1)).toBe('Intellijel 1U');
      expect(service.getStandardName(2)).toBe('PulpLogic 1U');
      expect(service.getStandardName(999)).toBe('Unknown');
    });
    
    it('should detect canFitLargest correctly per standard', () => {
      const modules: MinimalModule[] = [
        {id: 1, hp: 40, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
        {id: 2, hp: 100, standard: {id: 1, name: 'Intellijel 1U'}} as MinimalModule,
      ];
      
      const result = service.analyzeRackConfiguration(84, 2, modules);
      
      const standard0 = result.standardAnalyses.find(s => s.standardId === 0);
      const standard1 = result.standardAnalyses.find(s => s.standardId === 1);
      
      expect(standard0!.canFitLargest).toBe(true);  // 40 HP fits in 84 HP
      expect(standard1!.canFitLargest).toBe(false); // 100 HP doesn't fit in 84 HP
    });
    
    it('should suggest appropriate rack dimensions for large collection', () => {
      const modules: MinimalModule[] = [
        {id: 1, hp: 100, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
        {id: 2, hp: 50, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
      ];
      
      const result = service.suggestRackDimensions(modules);
      
      expect(result.hp).toBeGreaterThanOrEqual(100); // Must fit largest module
      expect(result.rows).toBeGreaterThan(0);
    });
    
    it('should handle modules without standard (defaults to standard 0)', () => {
      const modules = [
        {id: 1, hp: 8} as any, // No standard property
      ];
      
      const result = service.analyzeRackConfiguration(84, 2, modules);
      
      expect(result.standardAnalyses.length).toBe(1);
      expect(result.standardAnalyses[0].standardId).toBe(0); // Defaults to 0
      expect(result.standardAnalyses[0].moduleCount).toBe(1);
    });
    
    it('should support rack creator workflow: filter to 3U before analysis', () => {
      // This test demonstrates how rack creator component should work:
      // 1. User has mixed module collection (3U, 1U, etc.)
      // 2. Rack creator filters to only 3U modules
      // 3. Service analyzes only the filtered 3U modules
      
      const userModules: MinimalModule[] = [
        {id: 1, hp: 8, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
        {id: 2, hp: 10, standard: {id: 0, name: '3U Eurorack'}} as MinimalModule,
        {id: 3, hp: 6, standard: {id: 1, name: 'Intellijel 1U'}} as MinimalModule,
        {id: 4, hp: 4, standard: {id: 2, name: 'PulpLogic 1U'}} as MinimalModule,
      ];
      
      // Rack creator filters to only 3U
      const eurorack3UModules = service.filterModulesByStandard(userModules, 0);
      
      // Then analyzes only the 3U modules
      const result = service.analyzeRackConfiguration(84, 2, eurorack3UModules);
      
      expect(eurorack3UModules.length).toBe(2); // Only 3U modules
      expect(result.moduleCount).toBe(2); // Should only count the 3U modules
      expect(result.standardAnalyses.length).toBe(1); // Only one standard (3U)
      expect(result.standardAnalyses[0].standardId).toBe(0);
      expect(result.standardAnalyses[0].totalModulesHp).toBe(18); // 8 + 10
    });
  });
  
  describe('Bin Packing Accuracy', () => {
    it('should accurately calculate rows needed with discrete module widths', () => {
      // Test case: modules that don't divide evenly
      // Modules: 16HP, 12HP, 10HP (total 38HP)
      // Row capacity: 20HP
      // Naive: ceil(38/20) = 2 rows ❌
      // Actual: Row1=16HP, Row2=12HP, Row3=10HP = 3 rows ✓
      const modules: MinimalModule[] = [
        {id: 1, hp: 16, standard: {id: 0, name: '3U'}} as MinimalModule,
        {id: 2, hp: 12, standard: {id: 0, name: '3U'}} as MinimalModule,
        {id: 3, hp: 10, standard: {id: 0, name: '3U'}} as MinimalModule,
      ];
      
      const result = service.analyzeRackConfiguration(20, 2, modules);
      
      // Should correctly identify that 2 rows is NOT enough
      expect(result.recommendation).toContain('3 rows');
    });
    
    it('should handle perfect packing scenario', () => {
      // Modules that pack perfectly: 10HP + 10HP = 20HP per row
      const modules: MinimalModule[] = [
        {id: 1, hp: 10, standard: {id: 0, name: '3U'}} as MinimalModule,
        {id: 2, hp: 10, standard: {id: 0, name: '3U'}} as MinimalModule,
        {id: 3, hp: 10, standard: {id: 0, name: '3U'}} as MinimalModule,
        {id: 4, hp: 10, standard: {id: 0, name: '3U'}} as MinimalModule,
      ];
      
      const result = service.analyzeRackConfiguration(20, 2, modules);
      
      // Should fit exactly in 2 rows
      expect(result.recommendation).toContain('Perfect fit');
    });
    
    it('should handle worst case bin packing', () => {
      // Modules slightly over half: 11HP each, row is 20HP
      // Can only fit 1 per row despite being slightly over half
      const modules: MinimalModule[] = [
        {id: 1, hp: 11, standard: {id: 0, name: '3U'}} as MinimalModule,
        {id: 2, hp: 11, standard: {id: 0, name: '3U'}} as MinimalModule,
        {id: 3, hp: 11, standard: {id: 0, name: '3U'}} as MinimalModule,
      ];
      
      const result = service.analyzeRackConfiguration(20, 2, modules);
      
      // Should need 3 rows (one 11HP module per row)
      expect(result.recommendation).toContain('3 rows');
    });
    
    it('should optimize with First Fit Decreasing (large modules first)', () => {
      // Small modules first could waste space
      // Large modules first packs better
      const modules: MinimalModule[] = [
        {id: 1, hp: 4, standard: {id: 0, name: '3U'}} as MinimalModule,
        {id: 2, hp: 8, standard: {id: 0, name: '3U'}} as MinimalModule,
        {id: 3, hp: 4, standard: {id: 0, name: '3U'}} as MinimalModule,
        {id: 4, hp: 16, standard: {id: 0, name: '3U'}} as MinimalModule,
      ];
      
      const result = service.analyzeRackConfiguration(20, 2, modules);
      
      // Should efficiently pack: Row1=16+4=20, Row2=8+4=12
      expect(result.recommendation).toContain('Perfect fit');
    });
  });
});