export interface RackFunctionVisual {
  className: string;
  roleLabel: string;
  tagLabel: string;
  icon: string;
}

export interface FunctionAnalysisLegendItem {
  label: string;
  swatchClass: string;
}

export interface FunctionAnalysisLegendSummaryItem extends FunctionAnalysisLegendItem {
  count: number;
  hp: number;
}

export interface RowFunctionRoleBreakdown {
  label: string;
  className: string;
  moduleCount: number;
  hp: number;
}

export interface RowFunctionBreakdown {
  moduleCount: number;
  roles: RowFunctionRoleBreakdown[];
  residualCount: number;
  residualHp: number;
}
