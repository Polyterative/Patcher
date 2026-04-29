import { Standard } from '../../models/standard';

export interface ModuleFormatGeometry {
  id: number;
  name: string;
  heightMm: number;
  heightRem: number;
  hpWidthMm: number;
}

const EURORACK_3U_HEIGHT_MM = 128.5;
const EURORACK_3U_HEIGHT_REM = 25.4;
const EURORACK_HP_WIDTH_MM = 5.08;
const REM_PER_MM = EURORACK_3U_HEIGHT_REM / EURORACK_3U_HEIGHT_MM;

function mmToRem(heightMm: number): number {
  return Number((heightMm * REM_PER_MM).toFixed(4));
}

export const MODULE_FORMAT_GEOMETRY = {
  EURORACK_3U: {
    id: 0,
    name: '3U Eurorack',
    heightMm: EURORACK_3U_HEIGHT_MM,
    heightRem: EURORACK_3U_HEIGHT_REM,
    hpWidthMm: EURORACK_HP_WIDTH_MM
  },
  INTELLIJEL_1U: {
    id: 1,
    name: 'Intellijel 1U',
    heightMm: 45.72,
    heightRem: mmToRem(45.72),
    hpWidthMm: EURORACK_HP_WIDTH_MM
  },
  PULP_LOGIC_1U: {
    id: 2,
    name: 'Pulp Logic 1U',
    heightMm: 50,
    heightRem: mmToRem(50),
    hpWidthMm: EURORACK_HP_WIDTH_MM
  },
  EURORACK_3U_ALT: {
    id: 1000,
    name: '3U Eurorack',
    heightMm: EURORACK_3U_HEIGHT_MM,
    heightRem: EURORACK_3U_HEIGHT_REM,
    hpWidthMm: EURORACK_HP_WIDTH_MM
  }
} as const satisfies Record<string, ModuleFormatGeometry>;

const GEOMETRY_BY_STANDARD_ID: Record<number, ModuleFormatGeometry> = {
  [MODULE_FORMAT_GEOMETRY.EURORACK_3U.id]: MODULE_FORMAT_GEOMETRY.EURORACK_3U,
  [MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.id]: MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U,
  [MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U.id]: MODULE_FORMAT_GEOMETRY.PULP_LOGIC_1U,
  [MODULE_FORMAT_GEOMETRY.EURORACK_3U_ALT.id]: MODULE_FORMAT_GEOMETRY.EURORACK_3U_ALT
};

export function getModuleFormatGeometry(standard: Standard | undefined): ModuleFormatGeometry {
  const standardId = standard?.id;

  if (standardId == null) {
    return MODULE_FORMAT_GEOMETRY.EURORACK_3U;
  }

  if (standardId === MODULE_FORMAT_GEOMETRY.EURORACK_3U.id || standardId === MODULE_FORMAT_GEOMETRY.EURORACK_3U_ALT.id) {
    return MODULE_FORMAT_GEOMETRY.EURORACK_3U;
  }

  return GEOMETRY_BY_STANDARD_ID[standardId] ?? MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U;
}
