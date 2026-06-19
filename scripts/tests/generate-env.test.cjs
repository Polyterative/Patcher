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

test('generate-env enables Cool only for development builds', () => {
  const writes = runGenerator();
  const devContent = writes.get('src/environments/environment.ts');
  const prodContent = writes.get('src/environments/environment.prod.ts');

  assert.match(devContent, /production:\s*false/);
  assert.match(devContent, /coolReactionsEnabled:\s*true/);
  assert.match(prodContent, /production:\s*true/);
  assert.match(prodContent, /coolReactionsEnabled:\s*false/);
});
