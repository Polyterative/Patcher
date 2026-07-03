import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ENV_FILE_NAMES: readonly string[] = ['.env', '.env.local'];
const SERVICE_ROLE_KEY_NAMES: readonly string[] = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY'];
const SUPABASE_READ_KEY_NAMES: readonly string[] = [...SERVICE_ROLE_KEY_NAMES, 'SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY'];
const SUPABASE_WRITE_KEY_NAMES: readonly string[] = [...SERVICE_ROLE_KEY_NAMES, 'SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY'];

interface ReadLocalEnvOptions {
  rootDir?: string;
  envFileNames?: readonly string[];
}

type EnvSource = NodeJS.ProcessEnv | Record<string, string | undefined>;

export function readPriceHubScriptEnv(
  env: EnvSource = process.env,
  options: ReadLocalEnvOptions = {},
): NodeJS.ProcessEnv {
  const merged: Record<string, string> = {
    ...readLocalEnvFiles(options),
  };
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
      merged[key] = value;
    }
  }
  return merged as NodeJS.ProcessEnv;
}

export function readSupabaseServiceRoleKey(env: EnvSource): string {
  return readFirstNonEmptyEnvValue(env, SERVICE_ROLE_KEY_NAMES);
}

export function readSupabaseReadKey(env: EnvSource): string {
  return readFirstNonEmptyEnvValue(env, SUPABASE_READ_KEY_NAMES);
}

export function readSupabaseWriteKey(env: EnvSource): string {
  return readFirstNonEmptyEnvValue(env, SUPABASE_WRITE_KEY_NAMES);
}

function readFirstNonEmptyEnvValue(env: EnvSource, keys: readonly string[]): string {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return '';
}

export function parseLocalEnvContent(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    values[key] = normalizeEnvValue(rawValue);
  }
  return values;
}

function readLocalEnvFiles(options: ReadLocalEnvOptions): Record<string, string> {
  const rootDir = options.rootDir ? resolve(options.rootDir) : findRepositoryRoot();
  const envFileNames = options.envFileNames ?? DEFAULT_ENV_FILE_NAMES;
  const values: Record<string, string> = {};

  for (const fileName of envFileNames) {
    const filePath = join(rootDir, fileName);
    if (existsSync(filePath)) {
      Object.assign(values, parseLocalEnvContent(readFileSync(filePath, 'utf8')));
    }
  }

  return values;
}

function findRepositoryRoot(): string {
  let current = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    if (existsSync(join(current, 'package.json'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return resolve(process.cwd());
    }
    current = parent;
  }
}

function normalizeEnvValue(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return '';
  }

  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    const unquoted = trimmed.slice(1, -1);
    return quote === '"' ? unescapeDoubleQuotedValue(unquoted) : unquoted;
  }

  return trimmed.replace(/\s+#.*$/, '').trim();
}

function unescapeDoubleQuotedValue(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}
