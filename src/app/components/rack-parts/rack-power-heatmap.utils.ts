import { RackedModule } from 'src/app/models/module';
import { isBlankModule } from './rack-blank-module.constants';
import { formatPowerRailValue } from './rack-power-breakdown.utils';

export interface RackPowerHeatmapVisual {
  className: string;
  totalLabel: string;
  railsLabel: string;
}

export interface RackPowerHeatmapOptions {
  hoveredRowId?: number | null;
}

const BLANK_VISUAL: RackPowerHeatmapVisual = {
  className: 'powerAnalysisModule--blank',
  totalLabel: 'Blank',
  railsLabel: 'Spacer'
};

const MISSING_VISUAL: RackPowerHeatmapVisual = {
  className: 'powerAnalysisModule--missing',
  totalLabel: 'n/a',
  railsLabel: 'Missing rail data'
};

const INACTIVE_CLASS_NAME = 'powerAnalysisModule--inactive';

function absoluteTotalPower(rackedModule: RackedModule): number {
  return Math.abs(rackedModule.module.powerPos12 ?? 0)
    + Math.abs(rackedModule.module.powerNeg12 ?? 0)
    + Math.abs(rackedModule.module.powerPos5 ?? 0);
}

function heatmapClassName(ratio: number): string {
  if (ratio >= 0.95) { return 'powerAnalysisModule--peak'; }
  if (ratio >= 0.72) { return 'powerAnalysisModule--glow'; }
  if (ratio >= 0.46) { return 'powerAnalysisModule--signal'; }
  if (ratio > 0) { return 'powerAnalysisModule--smoke'; }
  return 'powerAnalysisModule--shadow';
}

function hasMissingPowerData(rackedModule: RackedModule): boolean {
  return [rackedModule.module.powerPos12, rackedModule.module.powerNeg12, rackedModule.module.powerPos5]
    .some(value => value == null);
}

function isCompletePoweredModule(rackedModule: RackedModule): boolean {
  return !isBlankModule(rackedModule.module.id) && !hasMissingPowerData(rackedModule);
}

function hottestModulePower(modules: RackedModule[]): number {
  return Math.max(...modules.map(absoluteTotalPower), 0);
}

function poweredVisual(rackedModule: RackedModule, className: string): RackPowerHeatmapVisual {
  const totalPower = absoluteTotalPower(rackedModule);

  return {
    className,
    totalLabel: `${ totalPower }mA total`,
    railsLabel: `+12 ${ formatPowerRailValue(rackedModule.module.powerPos12 ?? 0) } · -12 ${ formatPowerRailValue(rackedModule.module.powerNeg12 ?? 0) } · +5 ${ formatPowerRailValue(rackedModule.module.powerPos5 ?? 0) }`
  };
}

function inactiveVisual(rackedModule: RackedModule): RackPowerHeatmapVisual {
  if (isBlankModule(rackedModule.module.id)) {
    return {
      ...BLANK_VISUAL,
      className: INACTIVE_CLASS_NAME
    };
  }

  if (hasMissingPowerData(rackedModule)) {
    return {
      ...MISSING_VISUAL,
      className: INACTIVE_CLASS_NAME
    };
  }

  return poweredVisual(rackedModule, INACTIVE_CLASS_NAME);
}

export function rackPowerHeatmapKey(rackedModule: RackedModule): string {
  const moduleId = rackedModule.module.id;
  const {id, row, column} = rackedModule.rackingData;
  return `${ id ?? 'na' }|${ moduleId }|${ row }|${ column }`;
}

export function buildRackPowerHeatmapVisuals(
  rowedRackedModules: RackedModule[][],
  options: RackPowerHeatmapOptions = {}
): Map<string, RackPowerHeatmapVisual> {
  const visualMap = new Map<string, RackPowerHeatmapVisual>();
  const completeModules = rowedRackedModules.flat().filter(isCompletePoweredModule);
  const rackWideMaxPower = hottestModulePower(completeModules);
  const hoveredRowModules = options.hoveredRowId == null
    ? []
    : (rowedRackedModules[options.hoveredRowId] ?? []).filter(isCompletePoweredModule);
  const hoveredRowMaxPower = hottestModulePower(hoveredRowModules);

  rowedRackedModules
    .flat()
    .forEach(rackedModule => {
      const key = rackPowerHeatmapKey(rackedModule);
      const isNonHoveredRow = options.hoveredRowId != null
        && rackedModule.rackingData.row !== options.hoveredRowId;

      if (isNonHoveredRow) {
        visualMap.set(key, inactiveVisual(rackedModule));
        return;
      }

      if (isBlankModule(rackedModule.module.id)) {
        visualMap.set(key, BLANK_VISUAL);
        return;
      }

      if (hasMissingPowerData(rackedModule)) {
        visualMap.set(key, MISSING_VISUAL);
        return;
      }

      const totalPower = absoluteTotalPower(rackedModule);
      const scaleMaxPower = options.hoveredRowId != null
        && rackedModule.rackingData.row === options.hoveredRowId
        && hoveredRowMaxPower > 0
        ? hoveredRowMaxPower
        : rackWideMaxPower;
      const ratio = scaleMaxPower === 0 ? 0 : totalPower / scaleMaxPower;

      visualMap.set(key, poweredVisual(rackedModule, heatmapClassName(ratio)));
    });

  return visualMap;
}
