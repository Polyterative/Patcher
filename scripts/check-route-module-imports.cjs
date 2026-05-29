#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const moduleFiles = childProcess
  .execFileSync('find', ['src/app', '-name', '*.module.ts'], {
    cwd: repoRoot,
    encoding: 'utf8'
  })
  .trim()
  .split('\n')
  .filter(Boolean);

const routedFeatureModules = new Map();
const forRootViolations = [];

for (const relativePath of moduleFiles) {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  const classMatch = source.match(/export\s+class\s+(\w+)/);
  const className = classMatch?.[1];

  if (!className) {
    continue;
  }

  if (
    /RouterModule\.forRoot\s*\(/.test(source)
    && relativePath !== 'src/app/app-routing.module.ts'
  ) {
    forRootViolations.push(relativePath);
  }

  if (
    /RouterModule\.forChild\s*\(/.test(source)
    && !className.endsWith('RoutingModule')
  ) {
    routedFeatureModules.set(className, relativePath);
  }
}

const importViolations = [];

for (const relativePath of moduleFiles) {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

  for (const [className, routedModulePath] of routedFeatureModules) {
    if (relativePath === routedModulePath) {
      continue;
    }

    const importPattern = new RegExp(
      `import\\s*\\{[^}]*\\b${className}\\b[^}]*\\}\\s*from\\s*['"]`
    );

    if (importPattern.test(source)) {
      importViolations.push({
        importer: relativePath,
        importedClass: className,
        routedModulePath
      });
    }
  }
}

if (forRootViolations.length === 0 && importViolations.length === 0) {
  process.exit(0);
}

console.error('\nRoute module guard failed.\n');

if (forRootViolations.length > 0) {
  console.error('RouterModule.forRoot() is only allowed in src/app/app-routing.module.ts:');
  for (const violation of forRootViolations) {
    console.error(`  - ${violation}`);
  }
  console.error('');
}

if (importViolations.length > 0) {
  console.error(
    'Feature modules that declare RouterModule.forChild() must be lazy-loaded, not imported as shared UI modules.'
  );
  console.error('Extract reusable declarations into a separate shared/list module instead.\n');

  for (const violation of importViolations) {
    console.error(
      `  - ${violation.importer} imports ${violation.importedClass} from ${violation.routedModulePath}`
    );
  }
}

process.exit(1);
