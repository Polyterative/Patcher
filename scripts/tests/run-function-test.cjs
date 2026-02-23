#!/usr/bin/env node

const {spawnSync} = require('node:child_process');

const [sourceFile, outDir, testFile] = process.argv.slice(2);

if (!sourceFile || !outDir || !testFile) {
    console.error('Usage: node scripts/tests/run-function-test.cjs <source-ts> <out-dir> <test-file>');
    process.exit(1);
}

function runCommand(command, args) {
    const result = spawnSync(command, args, {stdio: 'inherit'});
    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }
    if (typeof result.status === 'number' && result.status !== 0) {
        process.exit(result.status);
    }
}

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

runCommand(npxCommand, [
    'tsc',
    sourceFile,
    '--target',
    'es2022',
    '--module',
    'commonjs',
    '--lib',
    'es2022,dom',
    '--outDir',
    outDir,
    '--skipLibCheck'
]);

runCommand('node', ['--test', testFile]);