import { SeoSocialShareData } from 'src/app/models/seo.model';
import { DbModule } from 'src/app/models/module';
import { normalizeForSearch } from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';
import { getModulePanelPublicUrl } from 'src/app/features/backend/supabase-storage';
import { clearJsonLdScript, upsertJsonLdScript } from 'src/app/shared-interproject/json-ld-dom';
import { JSONLD_SCRIPT_ID } from './module-browser-detail.constants';

export function buildModuleDetailSeoData(data: DbModule): SeoSocialShareData {
  const rawTags = data.tags.map(x => x.tag.name).filter(x => !!x);
  const ins = data.ins.map(x => x.name);
  const outs = data.outs.map(x => x.name);
  const keywords = [
    'eurorack',
    'module',
    data.manufacturer.name,
    data.name,
    rawTags,
    ins,
    outs
  ]
    .flatMap(x => x)
    .map(x => normalizeForSearch(x))
    .map(x => x.replace(/[^a-z0-9]/g, ''))
    .filter(x => !!x)
    .map(x => x.trim())
    .join(', ');
  const tagsClean = rawTags.map(x => x.replace(/[^a-z0-9]/g, '')).filter(x => !!x).map(x => x.trim()).join(', ');
  const panelImage = data.panels?.[0]?.filename
    ? getModulePanelPublicUrl(data.panels[0].filename)
    : undefined;

  return {
    title: `${ data.name } - details.`,
    description: buildModuleDetailDescription(data, tagsClean),
    keywords,
    published: data.created,
    modified: data.updated,
    image: panelImage,
  };
}

export function injectModuleJsonLd(data: DbModule): void {
  clearJsonLdScript(JSONLD_SCRIPT_ID);
  const panelFilename = data.panels?.[0]?.filename;
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': data.name ?? undefined,
    'description': data.description ?? undefined,
    'brand': {
      '@type': 'Brand',
      'name': data.manufacturer?.name ?? undefined,
    },
    'url': `https://patcher.xyz/modules/details/${ data.id }`,
    'image': panelFilename ? getModulePanelPublicUrl(panelFilename) : undefined,
  };
  Object.keys(jsonLd).forEach(k => jsonLd[k] === undefined && delete jsonLd[k]);
  upsertJsonLdScript(JSONLD_SCRIPT_ID, jsonLd);
}

function buildModuleDetailDescription(data: DbModule, tagsClean: string): string {
  const descParts: string[] = [];
  if (data.description) { descParts.push(data.description.trim()); }
  descParts.push(`${ data.hp } HP wide eurorack module by ${ data.manufacturer.name }.`);
  if (data.ins.length || data.outs.length) {
    descParts.push(`${ data.ins.length } input${ data.ins.length !== 1 ? 's' : '' } and ${ data.outs.length } output${ data.outs.length !== 1 ? 's' : '' }.`);
  }
  const powerParts: string[] = [];
  if (data.powerPos12 != null) { powerParts.push(`+12V: ${ data.powerPos12 }mA`); }
  if (data.powerNeg12 != null) { powerParts.push(`-12V: ${ data.powerNeg12 }mA`); }
  if (data.powerPos5 != null) { powerParts.push(`+5V: ${ data.powerPos5 }mA`); }
  if (powerParts.length) { descParts.push(`Power draw — ${ powerParts.join(', ') }.`); }
  if (data.depth) { descParts.push(`Depth: ${ data.depth }mm.`); }
  if (data.isDIY) { descParts.push(`DIY module.`); }
  if (tagsClean) { descParts.push(`Tags: ${ tagsClean }.`); }

  return descParts.join(' ');
}
