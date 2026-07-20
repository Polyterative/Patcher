import { DbModule } from 'src/app/models/module';
import { getModulePanelPublicUrl } from 'src/app/features/backend/supabase-storage';
import { JSONLD_SCRIPT_ID } from './module-browser-detail.constants';
import {
  buildModuleDetailSeoData,
  injectModuleJsonLd
} from './module-browser-detail.seo';

describe('module browser detail SEO helpers', () => {
  afterEach(() => {
    document.getElementById(JSONLD_SCRIPT_ID)?.remove();
  });

  function moduleFixture(overrides: Partial<DbModule> = {}): DbModule {
    return {
      id: 99,
      name: 'Mega Osc',
      manufacturer: {id: 5, name: 'Maker'},
      manufacturerId: 5,
      hp: 12,
      standard: {id: 0, name: 'Doepfer'},
      created: '2024-01-01',
      updated: '2024-01-02',
      description: '  rich   text  ',
      isDIY: true,
      depth: 42,
      powerPos12: 50,
      powerNeg12: 20,
      powerPos5: null,
      panels: [{id: 1, filename: 'mega-osc-panel.jpg'}],
      tags: [{tag: {name: 'fm'}}, {tag: {name: 'analog/filter'}}],
      ins: [{name: 'cv in'}],
      outs: [{name: 'audio out'}],
      manualURL: 'https://example.com/manual',
      public: true,
      ...overrides
    } as unknown as DbModule;
  }

  it('builds the same SEO data shape from module detail fields', () => {
    const seoData = buildModuleDetailSeoData(moduleFixture());

    expect(seoData).toEqual(jasmine.objectContaining({
      title: 'Mega Osc - details.',
      published: '2024-01-01',
      modified: '2024-01-02',
      image: getModulePanelPublicUrl('mega-osc-panel.jpg')
    }));
    expect(seoData.description).toContain('rich   text');
    expect(seoData.description).toContain('12 HP wide eurorack module by Maker.');
    expect(seoData.description).toContain('Power draw — +12V: 50mA, -12V: 20mA.');
    expect(seoData.description).toContain('Depth: 42mm.');
    expect(seoData.description).toContain('DIY module.');
    expect(seoData.description).toContain('Tags: fm, analogfilter.');
    expect(seoData.keywords).toContain('maker');
    expect(seoData.keywords).toContain('megaosc');
    expect(seoData.keywords).toContain('cvin');
  });

  it('injects product JSON-LD with the public panel image', () => {
    injectModuleJsonLd(moduleFixture());

    const script = document.getElementById(JSONLD_SCRIPT_ID) as HTMLScriptElement | null;
    const jsonLd = JSON.parse(script?.textContent ?? '{}') as Record<string, unknown>;

    expect(script?.type).toBe('application/ld+json');
    expect(jsonLd['@type']).toBe('Product');
    expect(jsonLd['name']).toBe('Mega Osc');
    expect(jsonLd['url']).toBe('https://patcher.xyz/modules/details/99');
    expect(jsonLd['image']).toBe(getModulePanelPublicUrl('mega-osc-panel.jpg'));
  });
});
