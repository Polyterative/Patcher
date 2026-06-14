const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');

const imageContracts = [
  {
    file: 'src/app/components/module-collection-parts/module-collection-card/module-collection-card.component.html',
    marker: 'class="collection-minimal__image"',
    attrs: ['loading="lazy"', 'decoding="async"', 'width="320"', 'height="180"', '[alt]="collection.name"']
  },
  {
    file: 'src/app/features/module-collections/module-collections-browser-detail/module-collections-browser-detail.component.html',
    marker: 'class="collection-summary__cover"',
    attrs: ['loading="lazy"', 'decoding="async"', 'width="320"', 'height="180"', '[alt]="bag.collection.name"']
  },
  {
    file: 'src/app/components/module-collection-parts/module-collection-editor/module-collection-editor.component.html',
    marker: 'alt="Collection cover preview"',
    attrs: ['decoding="async"', 'width="320"', 'height="180"']
  },
  {
    file: 'src/app/components/module-parts/module-details/module-details.component.html',
    marker: 'class="image-transition panel-gallery-img"',
    attrs: ['loading="lazy"', 'decoding="async"', 'width="120"', 'height="160"']
  },
  {
    file: 'src/app/components/module-parts/module-editor/module-editor.component.html',
    marker: 'class="setup-panel-preview-image"',
    attrs: ['decoding="async"', 'width="240"', 'height="320"', 'alt="Cropped panel preview"']
  },
  {
    file: 'src/app/components/patch-parts/patch-minimal/patch-minimal.component.html',
    marker: 'class="patch-linked-rack__preview"',
    attrs: ['loading="lazy"', 'decoding="async"', 'width="320"', 'height="180"']
  },
  {
    file: 'src/app/shared-interproject/components/@smart/general-context-menu/general-context-menu.component.html',
    marker: '[src]="child.imageUrl"',
    attrs: ['loading="lazy"', 'decoding="async"', 'width="28"', 'height="28"', '[alt]="child.label"']
  },
  {
    file: 'src/app/features/backbone/footer/producthunt-badge/producthunt-badge.component.html',
    marker: 'api.producthunt.com/widgets/embed-image',
    attrs: ['loading="lazy"', 'decoding="async"', 'width="250"', 'height="54"']
  },
  {
    file: 'src/app/features/manufacturer-detail/manufacturer-browser-root/manufacturer-row/manufacturer-row.component.html',
    marker: 'class="manufacturer-row-logo"',
    attrs: ['loading="lazy"', 'decoding="async"', 'width="48"', 'height="48"', '[alt]="manufacturer.name + \' logo\'"']
  }
];

function elementAround(content, marker) {
  const markerIndex = content.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing marker ${marker}`);
  const start = content.lastIndexOf('<img', markerIndex);
  const end = content.indexOf('>', markerIndex);
  assert.notEqual(start, -1, `Missing <img before ${marker}`);
  assert.notEqual(end, -1, `Missing closing bracket after ${marker}`);
  return content.slice(start, end + 1);
}

test('high-traffic images keep lazy-loading, dimensions, decoding, and alt metadata', () => {
  for (const contract of imageContracts) {
    const content = readFileSync(contract.file, 'utf8');
    const imageElement = elementAround(content, contract.marker);
    for (const attr of contract.attrs) {
      assert.match(imageElement, new RegExp(escapeRegExp(attr)), `${contract.file} missing ${attr}`);
    }
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
