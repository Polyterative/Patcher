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

      throw new Error(`Unexpected module: ${moduleName}`);
    }
  });

  return writes;
}

test('generate-env disables local-only production flags while preserving production-enabled developer API access', () => {
  const writes = runGenerator();
  const devContent = writes.get('src/environments/environment.ts');
  const prodContent = writes.get('src/environments/environment.prod.ts');

  assert.match(devContent, /production:\s*false/);
  assert.match(devContent, /coolReactionsEnabled:\s*true/);
  assert.match(devContent, /developerApiEnabled:\s*true/);
  assert.match(devContent, /modularGridImportEnabled:\s*true/);
  assert.match(devContent, /marketplaceEnabled:\s*true/);
  assert.match(prodContent, /production:\s*true/);
  assert.match(prodContent, /coolReactionsEnabled:\s*false/);
  assert.match(prodContent, /developerApiEnabled:\s*true/);
  assert.match(prodContent, /modularGridImportEnabled:\s*true/);
  assert.match(prodContent, /marketplaceEnabled:\s*false/);
});

test('generate-env defaults to the Patcher Supabase URL when only the anon key is local', () => {
  const writes = runGeneratorWithoutSupabaseUrl();
  const prodContent = writes.get('src/environments/environment.prod.ts');

  assert.match(prodContent, /url:\s*'https:\/\/sozmatmywjpstwidzlss\.supabase\.co'/);
  assert.match(prodContent, /key:\s*'anon-key'/);
});
