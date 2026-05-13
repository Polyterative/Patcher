import { RackedModule } from 'src/app/models/module';
import { isBlankModule } from './rack-blank-module.constants';
import { hasMissingPowerData } from './rack-power-data.utils';

export interface RackPowerRowBreakdown {
  rowIndex: number;
  moduleCount: number;
  missingPowerDataCount: number;
  powerPos12: number;
  powerNeg12: number;
  powerPos5: number;
}

export interface RackPowerBreakdown {
  rows: RackPowerRowBreakdown[];
  missingPowerDataCount: number;
  powerPos12: number;
  powerNeg12: number;
  powerPos5: number;
}

export function buildRackPowerBreakdown(rowedRackedModules: RackedModule[][]): RackPowerBreakdown {
  const missingPowerDataModuleIds = new Set<number>();

  const rows = rowedRackedModules.map((row, rowIndex) => {
    const rowMissingPowerDataModuleIds = new Set<number>();
    const modules = row.filter(rackedModule => !isBlankModule(rackedModule.module.id));

    const rowTotals = modules.reduce<Omit<RackPowerRowBreakdown, 'rowIndex' | 'moduleCount' | 'missingPowerDataCount'>>(
      (accumulator, rackedModule) => {
        accumulator.powerPos12 += rackedModule.module.powerPos12 ?? 0;
        accumulator.powerNeg12 += rackedModule.module.powerNeg12 ?? 0;
        accumulator.powerPos5 += rackedModule.module.powerPos5 ?? 0;

        if (hasMissingPowerData(rackedModule)) {
          missingPowerDataModuleIds.add(rackedModule.module.id);
          rowMissingPowerDataModuleIds.add(rackedModule.module.id);
        }

        return accumulator;
      },
      {
        powerPos12: 0,
        powerNeg12: 0,
        powerPos5: 0
      }
    );

    return {
      rowIndex,
      moduleCount: modules.length,
      missingPowerDataCount: rowMissingPowerDataModuleIds.size,
      ...rowTotals
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      powerPos12: acc.powerPos12 + row.powerPos12,
      powerNeg12: acc.powerNeg12 + row.powerNeg12,
      powerPos5: acc.powerPos5 + row.powerPos5
    }),
    {powerPos12: 0, powerNeg12: 0, powerPos5: 0}
  );

  return {
    rows,
    missingPowerDataCount: missingPowerDataModuleIds.size,
    ...totals
  };
}

export function formatPowerRailValue(value: number): string {
  return `${ Math.abs(value) } mA`;
}

export function formatRowPowerBreakdownValue(row: RackPowerRowBreakdown): string {
  return `+12 ${ formatPowerRailValue(row.powerPos12) } · -12 ${ formatPowerRailValue(row.powerNeg12) } · +5 ${ formatPowerRailValue(row.powerPos5) }`;
}
