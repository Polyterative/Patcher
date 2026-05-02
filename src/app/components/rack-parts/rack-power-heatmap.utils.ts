import { RackedModule } from 'src/app/models/module';
import { isBlankModule } from './rack-blank-module.constants';
import { formatPowerRailValue } from './rack-power-breakdown.utils';
import { hasMissingPowerData } from './rack-power-data.utils';

export interface RackPowerHeatmapVisual {
  className: string;
  totalLabel: string;
  railsLabel: string;
}

export interface RackPowerHeatmapOptions {
  hoveredRowIndex?: number | null;
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
const ZERO_POWER_VISUAL: RackPowerHeatmapVisual = {
  className: 'powerAnalysisModule--shadow',
  totalLabel: '0mA total',
  railsLabel: '+12 0 mA · -12 0 mA · +5 0 mA'
};
const HEATMAP_CLASS_BANDS = [
  {minimumRatio: 0.95, className: 'powerAnalysisModule--peak'},
  {minimumRatio: 0.72, className: 'powerAnalysisModule--glow'},
  {minimumRatio: 0.46, className: 'powerAnalysisModule--signal'},
  {minimumRatio: Number.EPSILON, className: 'powerAnalysisModule--smoke'}
] as const;

type RackPowerModuleVisualKind = 'blank' | 'missing' | 'powered';

interface RackPowerModuleVisualTarget {
  key: string;
  rowIndex: number;
  totalPower: number;
  kind: RackPowerModuleVisualKind;
  rackedModule: RackedModule;
}

function absoluteTotalPower(rackedModule: RackedModule): number {
  return Math.abs(rackedModule.module.powerPos12 ?? 0)
    + Math.abs(rackedModule.module.powerNeg12 ?? 0)
    + Math.abs(rackedModule.module.powerPos5 ?? 0);
}

function heatmapClassName(ratio: number): string {
  const band = HEATMAP_CLASS_BANDS.find(candidate => ratio >= candidate.minimumRatio);
  return band?.className ?? 'powerAnalysisModule--shadow';
}

function isCompletePoweredModule(rackedModule: RackedModule): boolean {
  return !isBlankModule(rackedModule.module.id) && !hasMissingPowerData(rackedModule);
}

function hottestModulePower(modules: RackedModule[]): number {
  return Math.max(...modules.map(absoluteTotalPower), 0);
}

function classifyModule(rackedModule: RackedModule): RackPowerModuleVisualTarget {
  if (isBlankModule(rackedModule.module.id)) {
    return {
      key: rackPowerHeatmapKey(rackedModule),
      rowIndex: rackedModule.rackingData.row,
      totalPower: 0,
      kind: 'blank',
      rackedModule
    };
  }

  if (hasMissingPowerData(rackedModule)) {
    return {
      key: rackPowerHeatmapKey(rackedModule),
      rowIndex: rackedModule.rackingData.row,
      totalPower: 0,
      kind: 'missing',
      rackedModule
    };
  }

  return {
    key: rackPowerHeatmapKey(rackedModule),
    rowIndex: rackedModule.rackingData.row,
    totalPower: absoluteTotalPower(rackedModule),
    kind: 'powered',
    rackedModule
  };
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
  const allModules = rowedRackedModules.flat();
  const completeModules = allModules.filter(isCompletePoweredModule);
  const rackWideMaxPower = hottestModulePower(completeModules);
  const hoveredRowModules = options.hoveredRowIndex == null
    ? []
    : (rowedRackedModules[options.hoveredRowIndex] ?? []).filter(isCompletePoweredModule);
  const hoveredRowMaxPower = hottestModulePower(hoveredRowModules);

  allModules
    .map(classifyModule)
    .forEach(moduleVisualTarget => {
      const isNonHoveredRow = options.hoveredRowIndex != null
        && moduleVisualTarget.rowIndex !== options.hoveredRowIndex;

      if (isNonHoveredRow) {
        visualMap.set(moduleVisualTarget.key, inactiveVisual(moduleVisualTarget.rackedModule));
        return;
      }

      if (moduleVisualTarget.kind === 'blank') {
        visualMap.set(moduleVisualTarget.key, BLANK_VISUAL);
        return;
      }

      if (moduleVisualTarget.kind === 'missing') {
        visualMap.set(moduleVisualTarget.key, MISSING_VISUAL);
        return;
      }

      const scaleMaxPower = options.hoveredRowIndex != null
        && moduleVisualTarget.rowIndex === options.hoveredRowIndex
        && hoveredRowMaxPower > 0
        ? hoveredRowMaxPower
        : rackWideMaxPower;
      const ratio = scaleMaxPower === 0 ? 0 : moduleVisualTarget.totalPower / scaleMaxPower;

      visualMap.set(
        moduleVisualTarget.key,
        poweredVisual(moduleVisualTarget.rackedModule, heatmapClassName(ratio))
      );
    });

  return visualMap;
}

export function defaultRackPowerHeatmapVisual(): RackPowerHeatmapVisual {
  return ZERO_POWER_VISUAL;
}
