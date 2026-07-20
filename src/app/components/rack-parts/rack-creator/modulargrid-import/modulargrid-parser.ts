import {
  ModularGridParseResult,
  ModularGridSourceModule
} from './modulargrid-import.types';

function toFiniteInteger(value: unknown): number | null {
  const numberValue = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : NaN;

  return Number.isFinite(numberValue) ? Math.trunc(numberValue) : null;
}

export function parseRows1u(value: unknown, rackRows: number): number[] {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  const serializedValueMatches = [...value.matchAll(/i:\d+;(?:i|s):\d*:?"?(\d+)"?/g)]
    .map(match => Number.parseInt(match[1], 10));
  const fallbackMatches = serializedValueMatches.length > 0
    ? serializedValueMatches
    : [...value.matchAll(/\d+/g)].map(match => Number.parseInt(match[0], 10));

  return [...new Set(fallbackMatches)]
    .filter(row => Number.isFinite(row) && row >= 1 && row <= rackRows)
    .sort((a, b) => a - b);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readModuleRackPlacement(module: Record<string, unknown>): Record<string, unknown> {
  const modulesRack = module['ModulesRack'];
  return isObject(modulesRack) ? modulesRack : module;
}

function normalizeSourceModule(module: unknown, index: number): ModularGridSourceModule | null {
  if (!isObject(module)) {
    return null;
  }

  const placement = readModuleRackPlacement(module);
  const row = toFiniteInteger(placement['row']);
  const col = toFiniteInteger(placement['col']);
  const name = typeof module['name'] === 'string' ? module['name'].trim() : '';

  if (!name || row === null || col === null || row < 1 || col < 1) {
    return null;
  }

  const mgIdValue = module['id'];
  const mgId = typeof mgIdValue === 'number' || typeof mgIdValue === 'string'
    ? mgIdValue
    : null;

  return {
    key: `${ row }:${ col }:${ index }`,
    mgId,
    name,
    row,
    col,
    inferredHp: 0
  };
}

function inferModuleHp(modules: ModularGridSourceModule[], rackHp: number): ModularGridSourceModule[] {
  const modulesByRow = new Map<number, ModularGridSourceModule[]>();
  modules.forEach(module => {
    const rowModules = modulesByRow.get(module.row) ?? [];
    rowModules.push(module);
    modulesByRow.set(module.row, rowModules);
  });

  modulesByRow.forEach(rowModules => {
    rowModules
      .sort((a, b) => a.col - b.col)
      .forEach((module, index) => {
        const nextModule = rowModules[index + 1];
        const inferredHp = nextModule
          ? nextModule.col - module.col
          : rackHp + 1 - module.col;
        module.inferredHp = Math.max(1, inferredHp);
      });
  });

  return modules;
}

export function parseModularGridExport(input: string): ModularGridParseResult {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return {
      status: 'empty',
      modules: [],
      warnings: []
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmedInput);
  } catch {
    return {
      status: 'invalid-json',
      error: 'invalid-json',
      modules: [],
      warnings: []
    };
  }

  if (!isObject(parsed) || !isObject(parsed['Rack']) || !isObject(parsed['User']) || !Array.isArray(parsed['Module'])) {
    return {
      status: 'wrong-shape',
      error: 'wrong-shape',
      modules: [],
      warnings: []
    };
  }

  const rack = parsed['Rack'];
  const rackName = typeof rack['name'] === 'string' ? rack['name'].trim() : '';
  const rows = toFiniteInteger(rack['rows']);
  const hp = toFiniteInteger(rack['te']);

  if (!rackName || rows === null || hp === null || rows < 1 || hp < 1) {
    return {
      status: 'wrong-shape',
      error: 'wrong-shape',
      modules: [],
      warnings: []
    };
  }

  const modules = inferModuleHp(
    parsed['Module']
      .map((module, index) => normalizeSourceModule(module, index))
      .filter((module): module is ModularGridSourceModule => !!module),
    hp
  );
  const rows1u = parseRows1u(rack['rows1u'], rows);
  const warnings = typeof rack['rows1u'] === 'string' && rack['rows1u'].trim() && rows1u.length === 0
    ? ['Could not detect 1U rows from rows1u; treating all rows as standard height.']
    : [];

  return {
    status: 'valid',
    rack: {
      name: rackName,
      rows,
      hp,
      format: typeof rack['format'] === 'string' ? rack['format'] : undefined,
      rows1u
    },
    modules,
    warnings
  };
}
