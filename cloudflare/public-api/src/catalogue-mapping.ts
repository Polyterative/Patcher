import type {
  ListPage,
  ModuleInclude,
  PublicManufacturer,
  PublicModule,
  PublicModuleSummary,
  PublicPanel,
  PublicPort,
  PublicStandard,
  PublicTag,
  SortMode,
} from './catalogue-types.ts';

export class MalformedCatalogueRowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedCatalogueRowError';
  }
}

export const MODULE_FIELD_ALLOWLIST = new Set([
  'id',
  'name',
  'description',
  'hp',
  'standard',
  'manufacturer_id',
  'depth',
  'depth_max',
  'is_diy',
  'manual_url',
  'power_neg_12',
  'power_pos_12',
  'power_pos_5',
  'switches',
  'weight',
]);

export const MANUFACTURER_FIELD_ALLOWLIST = new Set([
  'id',
  'name',
  'description',
  'tagline',
  'website_url',
  'social_links',
  'logo',
]);

export const STANDARD_FIELD_ALLOWLIST = new Set(['id', 'name']);
export const TAG_FIELD_ALLOWLIST = new Set(['id', 'name', 'type']);

const TAG_TYPE_NAMES: Readonly<Record<number, string>> = {
  1: 'nature',
  2: 'character',
  3: 'voice',
  4: 'source',
  5: 'filter',
  6: 'modulation',
  7: 'effect',
  8: 'sequencing',
  9: 'utility',
  10: 'blank',
};
const TAG_TYPE_NAME_SET = new Set(Object.values(TAG_TYPE_NAMES));
const PANEL_COLOR_NAMES: Readonly<Record<number, string>> = {
  1: 'Light',
  2: 'Dark',
  3: 'Special edition',
  4: 'Limited edition',
};
const PANEL_COLOR_NAME_SET = new Set(Object.values(PANEL_COLOR_NAMES));

export function normalizeModuleRow(row: unknown): PublicModuleSummary {
  const value = record(row, 'module');
  return {
    id: positiveInteger(value.id, 'module.id'),
    name: stringValue(value.name, 'module.name'),
    description: nullableString(value.description, 'module.description'),
    hp: nullableInteger(value.hp, 'module.hp'),
    standard: nullableInteger(value.standard, 'module.standard'),
    manufacturer_id: nullableInteger(value.manufacturer_id, 'module.manufacturer_id'),
    depth: nullableNumber(value.depth, 'module.depth'),
    depth_max: nullableNumber(value.depth_max, 'module.depth_max'),
    is_diy: nullableBoolean(value.is_diy, 'module.is_diy'),
    manual_url: nullableString(value.manual_url, 'module.manual_url'),
    power_neg_12: nullableNumber(value.power_neg_12, 'module.power_neg_12'),
    power_pos_12: nullableNumber(value.power_pos_12, 'module.power_pos_12'),
    power_pos_5: nullableNumber(value.power_pos_5, 'module.power_pos_5'),
    switches: nullableSwitches(value.switches, 'module.switches'),
    weight: nullableNumber(value.weight, 'module.weight'),
  };
}

export function normalizeManufacturerRow(row: unknown): PublicManufacturer {
  const value = record(row, 'manufacturer');
  return {
    id: positiveInteger(value.id, 'manufacturer.id'),
    name: stringValue(value.name, 'manufacturer.name'),
    description: nullableString(value.description, 'manufacturer.description'),
    tagline: nullableString(value.tagline, 'manufacturer.tagline'),
    website_url: nullableString(value.website_url, 'manufacturer.website_url'),
    social_links: jsonValue(value.social_links, 'manufacturer.social_links'),
    logo: nullableString(value.logo, 'manufacturer.logo'),
  };
}

export function normalizeStandardRow(row: unknown): PublicStandard {
  const value = record(row, 'standard');
  return {
    id: nonnegativeInteger(value.id, 'standard.id'),
    name: stringValue(value.name, 'standard.name'),
  };
}

export function normalizeTagRow(row: unknown): PublicTag {
  const value = record(row, 'tag');
  return {
    id: positiveInteger(value.id, 'tag.id'),
    name: stringValue(value.name, 'tag.name'),
    type: tagType(value.type, 'tag.type'),
  };
}

export function normalizePortRow(row: unknown): { moduleId: number; port: PublicPort } {
  const value = record(row, 'port');
  return {
    moduleId: positiveInteger(value.moduleid, 'port.moduleid'),
    port: {
      id: positiveInteger(value.id, 'port.id'),
      name: stringValue(value.name, 'port.name'),
      is_audio: nullableBoolean(value.is_audio, 'port.is_audio'),
      is_dcc: nullableBoolean(value.is_dcc, 'port.is_dcc'),
      is_voct: nullableBoolean(value.is_voct, 'port.is_voct'),
      min: nullableNumber(value.min, 'port.min'),
      max: nullableNumber(value.max, 'port.max'),
    },
  };
}

export function normalizePanelRow(row: unknown): { moduleId: number; panel: PublicPanel } {
  const value = record(row, 'panel');
  return {
    moduleId: positiveInteger(value.moduleid, 'panel.moduleid'),
    panel: {
      id: positiveDatabaseInteger(value.id, 'panel.id'),
      color: panelColor(value.color, 'panel.color'),
      description: nullableString(value.description, 'panel.description'),
    },
  };
}

export function normalizeModuleTagRow(row: unknown): { moduleId: number; tag: PublicTag } {
  const value = record(row, 'module_tag');
  return {
    moduleId: positiveInteger(value.moduleid, 'module_tag.moduleid'),
    tag: {
      id: positiveInteger(value.id, 'module_tag.id'),
      name: stringValue(value.name, 'module_tag.name'),
      type: tagType(value.type, 'module_tag.type'),
    },
  };
}

export function finalizeList<T extends { id: number; name: string }>(
  rows: readonly T[],
  limit: number,
  sort: SortMode
): ListPage<T> {
  const data = rows.slice(0, limit);
  const hasNext = rows.length > limit;
  const last = data[data.length - 1] ?? null;
  return {
    data,
    page: {
      next_cursor: hasNext && last ? encodeCursor(last, sort) : null,
    },
  };
}

export function applyModuleIncludes(
  modules: PublicModuleSummary[],
  includes: readonly ModuleInclude[],
  rows: {
    ins?: readonly { moduleId: number; port: PublicPort }[];
    outs?: readonly { moduleId: number; port: PublicPort }[];
    panels?: readonly { moduleId: number; panel: PublicPanel }[];
    tags?: readonly { moduleId: number; tag: PublicTag }[];
  }
): PublicModule[] {
  const ins = groupByModule(rows.ins ?? [], item => item.port);
  const outs = groupByModule(rows.outs ?? [], item => item.port);
  const panels = groupByModule(rows.panels ?? [], item => item.panel);
  const tags = groupByModule(rows.tags ?? [], item => item.tag);

  return modules.map(module => {
    const next: PublicModule = { ...module };
    if (includes.includes('ins')) {
      next.ins = ins.get(module.id) ?? [];
    }
    if (includes.includes('outs')) {
      next.outs = outs.get(module.id) ?? [];
    }
    if (includes.includes('panels')) {
      next.panels = panels.get(module.id) ?? [];
    }
    if (includes.includes('tags')) {
      next.tags = tags.get(module.id) ?? [];
    }
    return next;
  });
}

export function applySparseFields<T extends { id: number }>(
  item: T,
  fields: readonly string[] | null
): T {
  if (!fields) {
    return item;
  }
  const keep = new Set(['id', ...fields]);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (keep.has(key)) {
      result[key] = value;
    }
  }
  return result as unknown as T;
}

export function applySparseList<T extends { id: number }>(
  items: readonly T[],
  fields: readonly string[] | null
): T[] {
  return items.map(item => applySparseFields(item, fields));
}

function encodeCursor(item: { id: number; name: string }, sort: SortMode): string {
  const payload = JSON.stringify({
    v: 1,
    s: sort === 'name' ? item.name : item.id,
    id: item.id,
  });
  const encoded = btoa(
    Array.from(new TextEncoder().encode(payload), byte => String.fromCharCode(byte)).join('')
  );
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function groupByModule<Row extends { moduleId: number }, T>(
  rows: readonly Row[],
  pick: (row: Row) => T
): Map<number, T[]> {
  const result = new Map<number, T[]>();
  for (const row of rows) {
    const list = result.get(row.moduleId) ?? [];
    list.push(pick(row));
    result.set(row.moduleId, list);
  }
  return result;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    throw new MalformedCatalogueRowError(`${label} row must be an object`);
  }
  return value as Record<string, unknown>;
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new MalformedCatalogueRowError(`${label} must be a positive integer`);
  }
  return Number(value);
}

function positiveDatabaseInteger(value: unknown, label: string): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }
  throw new MalformedCatalogueRowError(`${label} must be a positive integer`);
}

function nonnegativeInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new MalformedCatalogueRowError(`${label} must be a nonnegative integer`);
  }
  return Number(value);
}

function tagType(value: unknown, label: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' && TAG_TYPE_NAME_SET.has(value)) {
    return value;
  }
  if (Number.isInteger(value) && TAG_TYPE_NAMES[Number(value)]) {
    return TAG_TYPE_NAMES[Number(value)];
  }
  throw new MalformedCatalogueRowError(`${label} must be a recognized tag type`);
}

function panelColor(value: unknown, label: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' && PANEL_COLOR_NAME_SET.has(value)) {
    return value;
  }
  if (Number.isInteger(value) && PANEL_COLOR_NAMES[Number(value)]) {
    return PANEL_COLOR_NAMES[Number(value)];
  }
  throw new MalformedCatalogueRowError(`${label} must be a recognized panel color`);
}

function nullableInteger(value: unknown, label: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Number.isInteger(value)) {
    throw new MalformedCatalogueRowError(`${label} must be an integer or null`);
  }
  return Number(value);
}

function nullableNumber(value: unknown, label: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new MalformedCatalogueRowError(`${label} must be a finite number or null`);
  }
  return value;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new MalformedCatalogueRowError(`${label} must be a nonempty string`);
  }
  return value;
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new MalformedCatalogueRowError(`${label} must be a string or null`);
  }
  return value;
}

function nullableBoolean(value: unknown, label: string): boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'boolean') {
    throw new MalformedCatalogueRowError(`${label} must be a boolean or null`);
  }
  return value;
}

function nullableSwitches(
  value: unknown,
  label: string
): { name: string; positions: string[] }[] | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw new MalformedCatalogueRowError(`${label} must be an array or null`);
  }
  return value.map((item, index) => {
    const switchValue = record(item, `${label}[${index}]`);
    if (!Array.isArray(switchValue.positions)
      || !switchValue.positions.every(position => typeof position === 'string')) {
      throw new MalformedCatalogueRowError(`${label}[${index}].positions must be a string array`);
    }
    return {
      name: stringValue(switchValue.name, `${label}[${index}].name`),
      positions: switchValue.positions,
    };
  });
}

function jsonValue(value: unknown, label: string): unknown {
  if (value === undefined) {
    throw new MalformedCatalogueRowError(`${label} must be present`);
  }
  return value;
}
