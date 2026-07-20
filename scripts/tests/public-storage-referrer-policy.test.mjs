import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

const SRC_APP_DIR = 'src/app';
const IMG_TAG_PATTERN = /<img\b[\s\S]*?>/gi;
const SOURCE_ATTR_PATTERN = /(?:\[(?:attr\.)?src\]|src)\s*=\s*"([^"]+)"/i;
const REFERRER_POLICY_PATTERN = /\breferrerpolicy\s*=\s*["']no-referrer["']/i;

const PUBLIC_STORAGE_IMAGE_BINDINGS = new Map([
  ['src/app/components/module-collection-parts/module-collection-card/module-collection-card.component.html', ['coverUrl']],
  ['src/app/components/module-parts/module-details/module-details.component.html', ['getPanelImageUrl(item.filename)']],
  ['src/app/components/module-parts/module-details/module-panel-zoom-dialog.component.html', ['data.imageUrl']],
  ['src/app/components/module-parts/module-minimal/module-part-image/module-part-image.component.html', ['imageSrc']],
  ['src/app/components/patch-parts/patch-minimal/patch-minimal.component.html', ['getRackPreviewUrl(bag.linkedRackState.rackImage)']],
  ['src/app/components/rack-parts/rack-image/rack-image.component.html', ['previewImageSrc']],
  ['src/app/features/manufacturer-detail/manufacturer-browser-root/manufacturer-row/manufacturer-row.component.html', ['logoStorageBase + manufacturer.logo']],
  ['src/app/features/manufacturer-detail/manufacturer-detail.component.html', ['logo']],
  ['src/app/features/module-collections/module-collections-browser-detail/module-collections-browser-detail.component.html', ['coverUrl']],
]);

test('public storage image template surfaces suppress browser referrers', () => {
  const failures = [];
  const checked = [];

  for (const [filePath, expectedSources] of PUBLIC_STORAGE_IMAGE_BINDINGS) {
    const html = readFileSync(filePath, 'utf8');
    const imgTags = Array.from(html.matchAll(IMG_TAG_PATTERN), match => match[0]);

    for (const expectedSource of expectedSources) {
      const matchingTags = imgTags.filter(tag => sourceExpression(tag) === expectedSource);
      assert.notEqual(
        matchingTags.length,
        0,
        `${ filePath } should still render an <img> bound to ${ expectedSource }`
      );

      for (const tag of matchingTags) {
        checked.push(`${ filePath } -> ${ expectedSource }`);
        if (!REFERRER_POLICY_PATTERN.test(tag)) {
          failures.push(`${ filePath } image bound to ${ expectedSource } is missing referrerpolicy="no-referrer"`);
        }
      }
    }
  }

  assert.deepEqual(failures, [], `Missing no-referrer on public storage images:\n${ failures.join('\n') }`);
  assert.equal(checked.length, 11);
});

test('new direct public storage template images must opt out of referrers or be classified', () => {
  const uncategorized = [];

  for (const filePath of listFiles(SRC_APP_DIR, '.html')) {
    const html = readFileSync(filePath, 'utf8');
    const knownSourcesForFile = PUBLIC_STORAGE_IMAGE_BINDINGS.get(filePath) ?? [];
    for (const match of html.matchAll(IMG_TAG_PATTERN)) {
      const tag = match[0];
      const source = sourceExpression(tag);
      if (
        source
        && /(?:images\.patcher\.xyz|\/storage\/v1\/object\/public|StorageUrls|storageBase|logoStorageBase|getPanelImageUrl|getRackPreviewUrl|previewImageSrc)/i.test(source)
        && !knownSourcesForFile.includes(source)
        && !REFERRER_POLICY_PATTERN.test(tag)
      ) {
        uncategorized.push(`${ filePath } -> ${ source }`);
      }
    }
  }

  assert.deepEqual(
    uncategorized,
    [],
    `Classify public storage images in PUBLIC_STORAGE_IMAGE_BINDINGS and add referrerpolicy="no-referrer":\n${ uncategorized.join('\n') }`
  );
});

test('programmatic public storage image probes set no-referrer before assigning src', () => {
  const failures = [];

  for (const filePath of listFiles(SRC_APP_DIR, '.ts')) {
    const source = readFileSync(filePath, 'utf8');
    for (const block of source.matchAll(/const\s+(\w+)\s*=\s*new Image\(\);[\s\S]*?\1\.src\s*=\s*([^;]+);/g)) {
      const [, imageVariable, srcExpression] = block;
      if (!/(?:MODULE_PANELS_BASE_URL|StorageUrls|images\.patcher\.xyz|\/storage\/v1\/object\/public)/.test(srcExpression)) {
        continue;
      }

      const beforeSrc = block[0].slice(0, block[0].lastIndexOf(`${ imageVariable }.src`));
      if (!new RegExp(`${ imageVariable }\\.referrerPolicy\\s*=\\s*['"]no-referrer['"]`).test(beforeSrc)) {
        failures.push(`${ filePath } ${ imageVariable }.src = ${ srcExpression.trim() }`);
      }
    }
  }

  assert.deepEqual(
    failures,
    [],
    `Programmatic public storage image loads must set image.referrerPolicy = 'no-referrer' before src:\n${ failures.join('\n') }`
  );
});

function sourceExpression(tag) {
  return tag.match(SOURCE_ATTR_PATTERN)?.[1]?.replace(/\s+/g, ' ').trim();
}

function listFiles(dir, extension) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...listFiles(path, extension));
    } else if (stats.isFile() && path.endsWith(extension)) {
      files.push(relative('.', path));
    }
  }

  return files.sort();
}
