import { RackBalanceAxisResult } from '../rack-balance-analysis.types';

export interface RadarPoint {
  x: number;
  y: number;
}

export interface RadarAxisViewModel {
  axis: RackBalanceAxisResult;
  point: RadarPoint;
  labelPoint: RadarPoint;
  shortLabel: string;
}
