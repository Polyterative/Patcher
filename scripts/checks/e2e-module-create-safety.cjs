#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const E2E_DIR = 'e2e';

function analyzeSource(filePath, source) {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const knownInitializers = new Map();
  const knownReturnValues = new Map();
  const issues = [];

  collectKnownSafeFactories(sourceFile, knownInitializers, knownReturnValues, sourceFile);
  visit(sourceFile, []);
  return issues;

  function visit(node, ancestors) {
    if (ts.isCallExpression(node)) {
      if (isBrowserModuleCreateWait(node, sourceFile) && !scopeHasFulfilledModulesRoute(node, ancestors, sourceFile)) {
        issues.push(issueFor(
          sourceFile,
          node,
          'browser module CREATE waits for a real POST /rest/v1/modules without a fulfilled Playwright route mock',
        ));
      }

      if (isDirectModulesInsertOrUpsert(node, sourceFile) && !isSafePrivatePayload(node.arguments[0], {
        knownInitializers,
        knownReturnValues,
        sourceFile,
      })) {
        issues.push(issueFor(
          sourceFile,
          node,
          'direct Supabase modules insert/upsert must be an explicit private RLS fixture (public:false and isApproved:false)',
        ));
      }
    }

    ts.forEachChild(node, child => visit(child, [...ancestors, node]));
  }
}

function collectKnownSafeFactories(sourceFile, knownInitializers, knownReturnValues) {
  walk(sourceFile);

  function walk(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      knownInitializers.set(node.name.text, node.initializer);
      const returned = functionReturnExpression(node.initializer);
      if (returned) {
        knownReturnValues.set(node.name.text, returned);
      }
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      const returned = functionReturnExpression(node);
      if (returned) {
        knownReturnValues.set(node.name.text, returned);
      }
    }

    ts.forEachChild(node, walk);
  }
}

function functionReturnExpression(node) {
  if (ts.isArrowFunction(node) && node.body) {
    if (!ts.isBlock(node.body)) {
      return node.body;
    }
    return firstReturnExpression(node.body);
  }

  if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) && node.body) {
    return firstReturnExpression(node.body);
  }

  return undefined;
}

function firstReturnExpression(block) {
  let returned;
  const visit = node => {
    if (returned) {
      return;
    }
    if (ts.isReturnStatement(node) && node.expression) {
      returned = node.expression;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(block);
  return returned;
}

function isBrowserModuleCreateWait(node, sourceFile) {
  const text = node.getText(sourceFile);
  if (!text.includes('/rest/v1/modules') || !hasPostMethodText(text)) {
    return false;
  }

  const callee = node.expression.getText(sourceFile);
  return callee.endsWith('waitForResponse')
    || callee.endsWith('waitForRequest')
    || callee === 'waitForResponseOk'
    || callee === 'waitForRequestOk';
}

function hasPostMethodText(text) {
  return /['"`]POST['"`]/.test(text);
}

function isDirectModulesInsertOrUpsert(node, sourceFile) {
  const callee = node.expression;
  if (!ts.isPropertyAccessExpression(callee)) {
    return false;
  }

  if (callee.name.text !== 'insert' && callee.name.text !== 'upsert') {
    return false;
  }

  return /\.from\(\s*['"`]modules['"`]\s*\)/.test(callee.expression.getText(sourceFile));
}

function scopeHasFulfilledModulesRoute(node, ancestors, sourceFile) {
  const scopedCall = [...ancestors].reverse().find(ancestor => isPlaywrightScopeCall(ancestor));
  const scopeText = (scopedCall ?? sourceFile).getText(sourceFile);
  return /(?:page|browserPage)\.route\(\s*['"`][^'"`]*\/rest\/v1\/modules[^'"`]*['"`][\s\S]*?\.fulfill\(/.test(scopeText);
}

function isPlaywrightScopeCall(node) {
  if (!ts.isCallExpression(node)) {
    return false;
  }

  const expression = node.expression;
  if (ts.isIdentifier(expression)) {
    return expression.text === 'test';
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return rootIdentifier(expression)?.text === 'test'
      && ['beforeEach', 'beforeAll', 'describe', 'fixme', 'only', 'skip'].includes(expression.name.text);
  }

  return false;
}

function rootIdentifier(expression) {
  let current = expression;
  while (ts.isPropertyAccessExpression(current)) {
    current = current.expression;
  }
  return ts.isIdentifier(current) ? current : undefined;
}

function isSafePrivatePayload(expression, context, seen = new Set()) {
  if (!expression) {
    return false;
  }

  const unwrapped = unwrapExpression(expression);

  if (ts.isObjectLiteralExpression(unwrapped)) {
    return objectHasFalseProperty(unwrapped, 'public') && objectHasFalseProperty(unwrapped, 'isApproved');
  }

  if (ts.isArrayLiteralExpression(unwrapped)) {
    return unwrapped.elements.length > 0
      && unwrapped.elements.every(element => isSafePrivatePayload(element, context, seen));
  }

  if (ts.isIdentifier(unwrapped)) {
    if (seen.has(unwrapped.text)) {
      return false;
    }
    seen.add(unwrapped.text);
    const initializer = context.knownInitializers.get(unwrapped.text);
    return initializer ? isSafePrivatePayload(initializer, context, seen) : false;
  }

  if (ts.isCallExpression(unwrapped) && ts.isIdentifier(unwrapped.expression)) {
    if (seen.has(unwrapped.expression.text)) {
      return false;
    }
    seen.add(unwrapped.expression.text);
    const returned = context.knownReturnValues.get(unwrapped.expression.text);
    return returned ? isSafePrivatePayload(returned, context, seen) : false;
  }

  return false;
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function objectHasFalseProperty(objectLiteral, propertyName) {
  const property = objectLiteral.properties.find(item => {
    if (!ts.isPropertyAssignment(item)) {
      return false;
    }
    return propertyNameText(item.name) === propertyName;
  });

  if (!property || !ts.isPropertyAssignment(property)) {
    return false;
  }

  const initializer = unwrapExpression(property.initializer);
  return initializer.kind === ts.SyntaxKind.FalseKeyword;
}

function propertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return undefined;
}

function issueFor(sourceFile, node, message) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    filePath: sourceFile.fileName,
    line: position.line + 1,
    column: position.character + 1,
    message,
  };
}

// Default to the repo root (two levels up from scripts/checks/), not process.cwd(),
// so this still finds the e2e/ directory when invoked from a different working
// directory than the package root.
const REPO_ROOT = path.join(__dirname, '..', '..');

function analyzeE2eTree(rootDir = REPO_ROOT) {
  const e2eRoot = path.join(rootDir, E2E_DIR);
  const files = listTypeScriptFiles(e2eRoot);
  return files.flatMap(filePath => analyzeSource(
    path.relative(rootDir, filePath),
    fs.readFileSync(filePath, 'utf8'),
  ));
}

function listTypeScriptFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, {withFileTypes: true});
  return entries.flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listTypeScriptFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith('.ts') ? [fullPath] : [];
  });
}

function main() {
  const issues = analyzeE2eTree();
  if (issues.length === 0) {
    console.log('[e2e-module-create-safety] E2E module CREATE safety guard passed.');
    return;
  }

  console.error('[e2e-module-create-safety] Refusing unsafe E2E module CREATE patterns:');
  for (const issue of issues) {
    console.error(`- ${issue.filePath}:${issue.line}:${issue.column} ${issue.message}`);
  }
  console.error('Mock browser POST /rest/v1/modules with page.route(...).fulfill(...), or keep direct RLS fixtures public:false and isApproved:false.');
  process.exitCode = 1;
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeE2eTree,
  analyzeSource,
  isSafePrivatePayload,
};
