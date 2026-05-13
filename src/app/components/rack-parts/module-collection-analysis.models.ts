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
