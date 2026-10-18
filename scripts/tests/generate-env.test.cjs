const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(repoRoot, 'generate-env.js'), 'utf8');

function runGenerator() {
  const writes = new Map();
  const sandboxProcess = {
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key'
    }
  };

  vm.runInNewContext(source, {
    __dirname: repoRoot,
    console: {log() {}, warn() {}},
    process: sandboxProcess,
    require(moduleName) {
      if (moduleName === 'fs') {
        return {
          existsSync: () => false,
          writeFileSync(filePath, content) {
            writes.set(filePath, content);
          }
        };
      }

      if (moduleName === 'path') {
        return path;
      }

      if (moduleName.endsWith('features.json')) {
        return require(path.join(repoRoot, moduleName));
      }

      throw new Error(`Unexpected module: ${moduleName}`);
    }
  });

  return writes;
}

function runGeneratorWithoutSupabaseUrl() {
  const writes = new Map();
  const sandboxProcess = {
    env: {
      SUPABASE_ANON_KEY: 'anon-key'
    }
  };

  vm.runInNewContext(source, {
    __dirname: repoRoot,
    console: {log() {}, warn() {}},
    process: sandboxProcess,
    require(moduleName) {
      if (moduleName === 'fs') {
        return {
          existsSync: () => false,
          writeFileSync(filePath, content) {
            writes.set(filePath, content);
          }
        };
      }

      if (moduleName === 'path') {
        return path;
      }

      if (moduleName.endsWith('features.json')) {
        return require(path.join(repoRoot, moduleName));
      }

      throw new Error(`Unexpected module: ${moduleName}`);
    }
  });

  return writes;
}

test('generate-env writes each environment flag from features.json', () => {
  const writes = runGenerator();
  const devContent = writes.get('src/environments/environment.ts');
  const prodContent = writes.get('src/environments/environment.prod.ts');
  // Expectations come from features.json so flipping a flag doesn't break this test.
  const features = require(path.join(repoRoot, 'src/environments/features.json'));

  assert.match(devContent, /production:\s*false/);
  assert.match(prodContent, /production:\s*true/);
  for (const [content, flags] of [[devContent, features.development], [prodContent, features.production]]) {
    for (const [key, value] of Object.entries(flags)) {
      assert.match(content, new RegExp(`${ key }:\\s*${ value }\\b`));
    }
  }
});

test('generate-env defaults to the Patcher Supabase URL when only the anon key is local', () => {
  const writes = runGeneratorWithoutSupabaseUrl();
  const prodContent = writes.get('src/environments/environment.prod.ts');

  assert.match(prodContent, /url:\s*'https:\/\/sozmatmywjpstwidzlss\.supabase\.co'/);
  assert.match(prodContent, /key:\s*'anon-key'/);
});

function runGeneratorWithExistingFile(existingContent) {
  const writes = new Map();
  const sandboxProcess = {
    env: {
      SUPABASE_ANON_KEY: 'anon-key'
    }
  };

  vm.runInNewContext(source, {
    __dirname: repoRoot,
    console: {log() {}, warn() {}},
    process: sandboxProcess,
    require(moduleName) {
      if (moduleName === 'fs') {
        return {
          existsSync: (filePath) => String(filePath).endsWith('environment.ts'),
          readFileSync: (filePath) => {
            if (String(filePath).endsWith('environment.ts')) return existingContent;
            return '';
          },
          writeFileSync(filePath, content) {
            writes.set(filePath, content);
          }
        };
      }

      if (moduleName === 'path') {
        return path;
      }

      if (moduleName.endsWith('features.json')) {
        return require(path.join(repoRoot, moduleName));
      }

      throw new Error(`Unexpected module: ${moduleName}`);
    }
  });

  return writes;
}

test('generate-env reuses existing environment url whitespace variants', () => {
  const existing = `export const environment = {\n  supabase: {\n    url:   'https://reused.example.com',\n    key: 'custom-key'\n  }\n};`;
  const writes = runGeneratorWithExistingFile(existing);
  const prodContent = writes.get('src/environments/environment.prod.ts');

  assert.match(prodContent, /url:\s*'https:\/\/reused\.example\.com'/);
});
