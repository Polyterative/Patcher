export function clearJsonLdScript(scriptId: string, doc: Document | undefined = globalThis.document): void {
  doc?.getElementById(scriptId)?.remove();
}

export function upsertJsonLdScript(
  scriptId: string,
  jsonLd: Record<string, unknown>,
  doc: Document | undefined = globalThis.document
): void {
  if (!doc) {
    return;
  }

  clearJsonLdScript(scriptId, doc);

  const script = doc.createElement('script');
  script.id = scriptId;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(jsonLd);
  doc.head.appendChild(script);
}
