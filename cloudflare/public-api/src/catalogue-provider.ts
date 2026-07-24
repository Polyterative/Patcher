import {
  applyModuleIncludes,
  applySparseFields,
  applySparseList,
  finalizeList,
  normalizeManufacturerRow,
  normalizeModuleRow,
  normalizeModuleTagRow,
  normalizePanelRow,
  normalizePortRow,
  normalizeStandardRow,
  normalizeTagRow,
} from './catalogue-mapping.ts';
import type {
  CatalogueProvider,
  ManufacturerDetailOptions,
  ManufacturerListOptions,
  ModuleDetailOptions,
  ModuleInclude,
  ModuleListOptions,
  PublicManufacturer,
  PublicModule,
  PublicModuleSummary,
  PublicStandard,
  PublicTag,
  ReferenceListOptions,
} from './catalogue-types.ts';
import {
  type HyperdriveBinding,
  type PostgresClient,
  withHyperdriveClient,
} from './database.ts';

type QueryRow = Record<string, unknown>;

export async function withHyperdriveCatalogueProvider<T>(
  hyperdrive: HyperdriveBinding,
  operation: (provider: CatalogueProvider) => Promise<T>
): Promise<T> {
  return withHyperdriveClient(hyperdrive, async sql => {
    const provider = new HyperdriveCatalogueProvider(sql);
    return operation(provider);
  });
}

export class HyperdriveCatalogueProvider implements CatalogueProvider {
  private readonly sql: PostgresClient;

  constructor(sql: PostgresClient) {
    this.sql = sql;
  }

  async listModules(options: ModuleListOptions) {
    const rows = await this.queryModules(options);
    const modules = rows.map(normalizeModuleRow);
    const page = finalizeList(modules, options.limit, options.sort);
    const included = await this.loadModuleIncludes(
      page.data.map(module => module.id),
      options.include
    );
    return {
      data: sparsifyModules(
        applyModuleIncludes(page.data, options.include, included),
        options.fields,
        options.include
      ),
      page: page.page,
    };
  }

  async getModule(id: number, options: ModuleDetailOptions): Promise<PublicModule | null> {
    const rows = await this.sql<QueryRow[]>`
      select
        id,
        name,
        description,
        hp,
        standard,
        "manufacturerId" as manufacturer_id,
        depth,
        "depthMax" as depth_max,
        "isDIY" as is_diy,
        "manualURL" as manual_url,
        "powerNeg12" as power_neg_12,
        "powerPos12" as power_pos_12,
        "powerPos5" as power_pos_5,
        switches,
        weight
      from public.api_v1_modules
      where id = ${id}::integer
      limit 1
    `;
    if (rows.length === 0) {
      return null;
    }
    const base = normalizeModuleRow(rows[0]);
    const included = await this.loadModuleIncludes([base.id], options.include);
    return sparsifyModules(
      applyModuleIncludes([base], options.include, included),
      options.fields,
      options.include
    )[0];
  }

  async listManufacturers(options: ManufacturerListOptions) {
    const rows = await this.queryManufacturers(options);
    const manufacturers = rows.map(normalizeManufacturerRow);
    const page = finalizeList(manufacturers, options.limit, options.sort);
    return {
      data: applySparseList(page.data, options.fields),
      page: page.page,
    };
  }

  async getManufacturer(
    id: number,
    options: ManufacturerDetailOptions
  ): Promise<PublicManufacturer | null> {
    const rows = await this.sql<QueryRow[]>`
      select
        id,
        name,
        description,
        tagline,
        "websiteURL" as website_url,
        social_links,
        logo
      from public.api_v1_manufacturers
      where id = ${id}::integer
      limit 1
    `;
    if (rows.length === 0) {
      return null;
    }

    const manufacturer = applySparseFields(
      normalizeManufacturerRow(rows[0]),
      options.fields
    );
    if (options.includeModules) {
      manufacturer.modules = await this.listModuleSummariesByManufacturer(id);
    }
    return manufacturer;
  }

  async listStandards(options: ReferenceListOptions) {
    const rows = await this.queryStandards(options);
    const standards = rows.map(normalizeStandardRow);
    const page = finalizeList(standards, options.limit, options.sort);
    return {
      data: applySparseList(page.data, options.fields),
      page: page.page,
    };
  }

  async listTags(options: ReferenceListOptions) {
    const rows = await this.queryTags(options);
    const tags = rows.map(normalizeTagRow);
    const page = finalizeList(tags, options.limit, options.sort);
    return {
      data: applySparseList(page.data, options.fields),
      page: page.page,
    };
  }

  private queryModules(options: ModuleListOptions): Promise<QueryRow[]> {
    const cursorId = options.cursor?.id ?? null;
    const cursorName = typeof options.cursor?.s === 'string' ? options.cursor.s : null;
    const cursorSortId = typeof options.cursor?.s === 'number' ? options.cursor.s : null;
    const fetchLimit = options.limit + 1;
    const filters = options.filters;

    if (options.sort === 'id') {
      return this.sql<QueryRow[]>`
        select
          m.id,
          m.name,
          m.description,
          m.hp,
          m.standard,
          m."manufacturerId" as manufacturer_id,
          m.depth,
          m."depthMax" as depth_max,
          m."isDIY" as is_diy,
          m."manualURL" as manual_url,
          m."powerNeg12" as power_neg_12,
          m."powerPos12" as power_pos_12,
          m."powerPos5" as power_pos_5,
          m.switches,
          m.weight
        from public.api_v1_modules m
        where (${filters.manufacturerId}::integer is null
            or m."manufacturerId" = ${filters.manufacturerId}::integer)
          and (${filters.hp}::integer is null or m.hp = ${filters.hp}::integer)
          and (${filters.standard}::integer is null or m.standard = ${filters.standard}::integer)
          and (
            ${filters.tag}::integer is null
            or exists (
              select 1
              from public.api_v1_module_tags mt
              where mt.moduleid = m.id and mt.tagid = ${filters.tag}::integer
            )
          )
          and (${cursorSortId}::integer is null or m.id > ${cursorId}::integer)
        order by m.id asc
        limit ${fetchLimit}::integer
      `;
    }

    return this.sql<QueryRow[]>`
      select
        m.id,
        m.name,
        m.description,
        m.hp,
        m.standard,
        m."manufacturerId" as manufacturer_id,
        m.depth,
        m."depthMax" as depth_max,
        m."isDIY" as is_diy,
        m."manualURL" as manual_url,
        m."powerNeg12" as power_neg_12,
        m."powerPos12" as power_pos_12,
        m."powerPos5" as power_pos_5,
        m.switches,
        m.weight
      from public.api_v1_modules m
      where (${filters.manufacturerId}::integer is null
          or m."manufacturerId" = ${filters.manufacturerId}::integer)
        and (${filters.hp}::integer is null or m.hp = ${filters.hp}::integer)
        and (${filters.standard}::integer is null or m.standard = ${filters.standard}::integer)
        and (
          ${filters.tag}::integer is null
          or exists (
            select 1
            from public.api_v1_module_tags mt
            where mt.moduleid = m.id and mt.tagid = ${filters.tag}::integer
          )
        )
        and (
          ${cursorName}::text is null
          or m.name > ${cursorName}::text
          or (m.name = ${cursorName}::text and m.id > ${cursorId}::integer)
        )
      order by m.name asc, m.id asc
      limit ${fetchLimit}::integer
    `;
  }

  private queryManufacturers(options: ManufacturerListOptions): Promise<QueryRow[]> {
    const cursorId = options.cursor?.id ?? null;
    const cursorName = typeof options.cursor?.s === 'string' ? options.cursor.s : null;
    const cursorSortId = typeof options.cursor?.s === 'number' ? options.cursor.s : null;
    const fetchLimit = options.limit + 1;

    if (options.sort === 'id') {
      return this.sql<QueryRow[]>`
        select id, name, description, tagline, "websiteURL" as website_url, social_links, logo
        from public.api_v1_manufacturers
        where (${cursorSortId}::integer is null or id > ${cursorId}::integer)
        order by id asc
        limit ${fetchLimit}::integer
      `;
    }

    return this.sql<QueryRow[]>`
      select id, name, description, tagline, "websiteURL" as website_url, social_links, logo
      from public.api_v1_manufacturers
      where (
        ${cursorName}::text is null
        or name > ${cursorName}::text
        or (name = ${cursorName}::text and id > ${cursorId}::integer)
      )
      order by name asc, id asc
      limit ${fetchLimit}::integer
    `;
  }

  private queryStandards(options: ReferenceListOptions): Promise<QueryRow[]> {
    const cursorId = options.cursor?.id ?? null;
    const cursorName = typeof options.cursor?.s === 'string' ? options.cursor.s : null;
    const cursorSortId = typeof options.cursor?.s === 'number' ? options.cursor.s : null;
    const fetchLimit = options.limit + 1;

    if (options.sort === 'id') {
      return this.sql<QueryRow[]>`
        select id, name
        from public.api_v1_standards
        where (${cursorSortId}::integer is null or id > ${cursorId}::integer)
        order by id asc
        limit ${fetchLimit}::integer
      `;
    }

    return this.sql<QueryRow[]>`
      select id, name
      from public.api_v1_standards
      where (
        ${cursorName}::text is null
        or name > ${cursorName}::text
        or (name = ${cursorName}::text and id > ${cursorId}::integer)
      )
      order by name asc, id asc
      limit ${fetchLimit}::integer
    `;
  }

  private queryTags(options: ReferenceListOptions): Promise<QueryRow[]> {
    const cursorId = options.cursor?.id ?? null;
    const cursorName = typeof options.cursor?.s === 'string' ? options.cursor.s : null;
    const cursorSortId = typeof options.cursor?.s === 'number' ? options.cursor.s : null;
    const fetchLimit = options.limit + 1;

    if (options.sort === 'id') {
      return this.sql<QueryRow[]>`
        select id, name, type
        from public.api_v1_tags
        where (${cursorSortId}::integer is null or id > ${cursorId}::integer)
        order by id asc
        limit ${fetchLimit}::integer
      `;
    }

    return this.sql<QueryRow[]>`
      select id, name, type
      from public.api_v1_tags
      where (
        ${cursorName}::text is null
        or name > ${cursorName}::text
        or (name = ${cursorName}::text and id > ${cursorId}::integer)
      )
      order by name asc, id asc
      limit ${fetchLimit}::integer
    `;
  }

  private async loadModuleIncludes(
    moduleIds: readonly number[],
    includes: readonly ModuleInclude[]
  ): Promise<{
    ins?: { moduleId: number; port: ReturnType<typeof normalizePortRow>['port'] }[];
    outs?: { moduleId: number; port: ReturnType<typeof normalizePortRow>['port'] }[];
    panels?: { moduleId: number; panel: ReturnType<typeof normalizePanelRow>['panel'] }[];
    tags?: { moduleId: number; tag: PublicTag }[];
  }> {
    if (moduleIds.length === 0 || includes.length === 0) {
      return {};
    }
    const ids = [...moduleIds];
    const result: Awaited<ReturnType<HyperdriveCatalogueProvider['loadModuleIncludes']>> = {};

    if (includes.includes('ins')) {
      const rows = await this.sql<QueryRow[]>`
        select id, moduleid, name, "isAudio" as is_audio, "isDCC" as is_dcc,
          "isVOCT" as is_voct, min, max
        from public.api_v1_module_ins
        where moduleid = any(${this.sql.array(ids, 23)})
        order by moduleid asc, id asc
      `;
      result.ins = rows.map(normalizePortRow);
    }
    if (includes.includes('outs')) {
      const rows = await this.sql<QueryRow[]>`
        select id, moduleid, name, "isAudio" as is_audio, "isDCC" as is_dcc,
          "isVOCT" as is_voct, min, max
        from public.api_v1_module_outs
        where moduleid = any(${this.sql.array(ids, 23)})
        order by moduleid asc, id asc
      `;
      result.outs = rows.map(normalizePortRow);
    }
    if (includes.includes('panels')) {
      const rows = await this.sql<QueryRow[]>`
        select id, moduleid, color, description
        from public.api_v1_module_panels
        where moduleid = any(${this.sql.array(ids, 23)})
        order by moduleid asc, id asc
      `;
      result.panels = rows.map(normalizePanelRow);
    }
    if (includes.includes('tags')) {
      const rows = await this.sql<QueryRow[]>`
        select mt.moduleid, t.id, t.name, t.type
        from public.api_v1_module_tags mt
        join public.api_v1_tags t on t.id = mt.tagid
        where mt.moduleid = any(${this.sql.array(ids, 23)})
        order by mt.moduleid asc, t.name asc, t.id asc
      `;
      result.tags = rows.map(normalizeModuleTagRow);
    }

    return result;
  }

  private async listModuleSummariesByManufacturer(
    manufacturerId: number
  ): Promise<PublicModuleSummary[]> {
    const rows = await this.sql<QueryRow[]>`
      select
        id,
        name,
        description,
        hp,
        standard,
        "manufacturerId" as manufacturer_id,
        depth,
        "depthMax" as depth_max,
        "isDIY" as is_diy,
        "manualURL" as manual_url,
        "powerNeg12" as power_neg_12,
        "powerPos12" as power_pos_12,
        "powerPos5" as power_pos_5,
        switches,
        weight
      from public.api_v1_modules
      where "manufacturerId" = ${manufacturerId}::integer
      order by name asc, id asc
    `;
    return rows.map(normalizeModuleRow);
  }
}

function sparsifyModules(
  modules: PublicModule[],
  fields: readonly string[] | null,
  includes: readonly ModuleInclude[]
): PublicModule[] {
  return modules.map(module => {
    const next = applySparseFields(module, fields) as PublicModule;
    if (includes.includes('ins') && module.ins) {
      next.ins = module.ins;
    }
    if (includes.includes('outs') && module.outs) {
      next.outs = module.outs;
    }
    if (includes.includes('panels') && module.panels) {
      next.panels = module.panels;
    }
    if (includes.includes('tags') && module.tags) {
      next.tags = module.tags;
    }
    return next;
  });
}
