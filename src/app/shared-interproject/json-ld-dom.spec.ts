import {
  clearJsonLdScript,
  upsertJsonLdScript
} from './json-ld-dom';

describe('json-ld-dom helpers', () => {
  const scriptId = 'test-jsonld';

  afterEach(() => {
    document.getElementById(scriptId)?.remove();
  });

  it('upserts a JSON-LD script into the document head', () => {
    upsertJsonLdScript(scriptId, {'@context': 'https://schema.org', '@type': 'Thing'});

    const script = document.getElementById(scriptId) as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script?.type).toBe('application/ld+json');
    expect(script?.textContent).toContain('"@type":"Thing"');
  });

  it('replaces an existing JSON-LD script with the same id', () => {
    upsertJsonLdScript(scriptId, {'@type': 'Thing'});
    upsertJsonLdScript(scriptId, {'@type': 'Product'});

    const scripts = document.querySelectorAll(`#${ scriptId }`);
    expect(scripts.length).toBe(1);
    expect(scripts[0].textContent).toContain('"@type":"Product"');
  });

  it('is a no-op when no document is available', () => {
    expect(() => {
      clearJsonLdScript(scriptId, undefined);
      upsertJsonLdScript(scriptId, {'@type': 'Thing'}, undefined);
    }).not.toThrow();
  });
});
