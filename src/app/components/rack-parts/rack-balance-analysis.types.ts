import { RackBalanceAxisId } from './rack-balance-analysis.constants';

export interface RackBalanceAxisResult {
  id: RackBalanceAxisId;
  label: string;
  icon: string;
  share: number;
  matchedModules: number;
  guidance: string;
}

export interface RackBalanceAnalysisResult {
  axes: RackBalanceAxisResult[];
  confidence: number;
  recognizedModuleCount: number;
  totalModules: number;
  warningMessage: string | null;
  summary: string;
  isEmpty: boolean;
}
