export class DbPaths {
  // Manufacturer
  static modules = 'modules' as const;
  static moduleINs = 'module_ins' as const;
  static moduleOUTs = 'module_outs' as const;
  static manufacturers = 'manufacturers' as const;
  static manufacturer_claims = 'manufacturer_claims' as const;
  static user_modules = 'user_modules' as const;
  static user_module_acquisitions = 'user_module_acquisitions' as const;
  static module_availability_tags = 'module_availability_tags' as const;
  static module_collections = 'module_collections' as const;
  static module_collection_entries = 'module_collection_entries' as const;
  static racks = 'racks' as const;
  static rack_modules = 'rack_modules' as const;
  static rack_modules_grouped_by_moduleid = 'rack_modules_grouped_by_moduleid' as const;
  static patches_for_modules = 'patches_for_modules' as const;
  static patches = 'patches' as const;
  static patch_connections = 'patch_connections' as const;
  static patch_module_instances = 'patch_module_instances' as const;
  static module_tags = 'module_tags' as const;
  static module_panels = 'module_panels' as const;
  static tags = 'tags' as const;
  static user_module_tags = 'user_module_tags' as const;
  static standards = 'standards' as const;
  static profiles = 'profiles' as const;
  static comments = 'comments' as const;
  static module_flags = 'module_flags' as const;
  static module_flag_counts = 'module_flag_counts' as const;
  static reactions = 'reactions' as const;
  static reaction_counts = 'reaction_counts' as const;
  static stores = 'stores' as const;
  static module_store_listings = 'module_store_listings' as const;
  static module_price_snapshots = 'module_price_snapshots' as const;
  static shipping_addresses = 'shipping_addresses' as const;
  static marketplace_listings = 'marketplace_listings' as const;
  static listing_media = 'listing_media' as const;
  static api_keys = 'api_keys' as const;
  static api_tiers = 'api_tiers' as const;
  static api_key_usage_monthly = 'api_key_usage_monthly' as const;

}

export class DbStoragePaths {
  static module_panels = 'module-panels' as const;
  static racks = 'racks' as const;
  static patches = 'patches' as const;
  static manufacturer_logos = 'manufacturer-logos' as const;
  static module_collections = 'module-collections' as const;
  static marketplace_listings = 'marketplace-listings' as const;
}

const PUBLIC_IMAGE_PROXY_BASE = 'https://images.patcher.xyz/';

/** Ready-to-use public base URLs for each storage bucket. Append a filename to get a full asset URL. */
export class StorageUrls {
  static modulePanels = `${PUBLIC_IMAGE_PROXY_BASE}${DbStoragePaths.module_panels}/`;
  static manufacturerLogos = `${PUBLIC_IMAGE_PROXY_BASE}${DbStoragePaths.manufacturer_logos}/`;
  static moduleCollections = `${PUBLIC_IMAGE_PROXY_BASE}${DbStoragePaths.module_collections}/`;
  static racks = `${PUBLIC_IMAGE_PROXY_BASE}${DbStoragePaths.racks}/`;
  static patches = `${PUBLIC_IMAGE_PROXY_BASE}${DbStoragePaths.patches}/`;
  static marketplaceListings = `${PUBLIC_IMAGE_PROXY_BASE}${DbStoragePaths.marketplace_listings}/`;
}

export class QueryJoins {
  // Manufacturer
  static manufacturer: string = 'manufacturer:manufacturerId(name,id,logo)';

  // Standard
  static standard: string = 'standard:standards!modules_standard_fkey(name,id)';

  // Patch
  static patch: string = 'patch:patches!patch_connections_patchid_fkey(id)';

  // Patch connection CV columns (rendered fields only — patch-graph/patch-minimal/
  // patch-browser-detail only read the CV id and jack name; min/max/isVOCT/isDCC/
  // isAudio/authorid belong to the module-detail CV editing view, not connections).
  static patchConnectionCv: string = 'id,name';

  // Patch connection module columns (rendered fields only — patch-graph re-fetches
  // full module data separately via modulesByIds; patch-minimal/patch-browser-detail
  // only read module id/name/manufacturer name from the connection join itself, but
  // patch-connection-minimal renders the full module-minimal card via app-module-part-image,
  // which needs panels(id,color,filename) to resolve the panel thumbnail — omitting this
  // silently blanks the module image in the patch-detail connections list).
  static patchConnectionModule: string = `id,name,manufacturer:manufacturerId(name),panels:${ DbPaths.module_panels }!module_panels_moduleid_fkey(id,color,filename)`;

  // Author
  static author: string = 'author:authorid(username,id)';
  static publicAuthorGate(alias = 'author_profile_gate'): string {
    return `${ alias }:authorid!inner(public)`;
  }

  // Comment list columns — rendered fields only (authorId/created are filtered/ordered
  // on at the DB level and never read from the fetched row by any consumer).
  static commentListColumns: string = 'id,content,entityId,entityType,updated,profile:profiles(id,username)';

  // Module Tags
  static module_tags: string = `tags:${ DbPaths.module_tags }(id,tag:${ DbPaths.tags }(*),voteCount:${ DbPaths.user_module_tags }(moduletagid))`;

  // Module Panels
  static module_panels: string = `panels:${ DbPaths.module_panels }!module_panels_moduleid_fkey(*)`;

  // Rack-display panel columns (rendered fields only — module-part-image reads
  // id/color/filename, module-realistic/module-details tooltips read description;
  // created/updated/isApproved are moderation/audit-only fields never read by any
  // rack rendering or editor-interaction path).
  static rackDisplayModulePanels: string = `panels:${ DbPaths.module_panels }!module_panels_moduleid_fkey(id,color,filename,description)`;

  // Ins/Outs with signal-flow flags (id, name, port-kind flags) — used for rack/patch
  // signal-flow rendering, which never needs CV min/max/isApproved/authorid.
  static insOutsSignalFlow: string = `ins:${ DbPaths.moduleINs }(id,name,isVOCT,isDCC,isAudio), outs:${ DbPaths.moduleOUTs }(id,name,isVOCT,isDCC,isAudio)`;

  // Flat column list for a standalone module select used to render a module inside a rack
  // (e.g. blank-panel lookups) — mirrors the fields already exposed via module_fk_rackmodules.
  static rackDisplayModuleColumns: string = `
    id,
    name,
    hp,
    weight,
    depth,
    powerPos12,
    powerNeg12,
    powerPos5,
    manufacturer:manufacturerId(name,id),
    standard:standards!modules_standard_fkey(name,id),
    ${ QueryJoins.module_tags },
    ${ QueryJoins.rackDisplayModulePanels },
    ${ QueryJoins.insOutsSignalFlow }
  `;

  // Module Foreign Key in Rack Modules
  static module_fk_rackmodules: string = `module:modules!rack_modules_moduleid_fkey(
    ${ QueryJoins.rackDisplayModuleColumns }
  )`;

  // Module Collections
  static moduleCollection: string = 'collection:module_collections!module_collection_entries_collection_id_fkey(*)';
  static moduleCollectionEntries: string = `entries:${ DbPaths.module_collection_entries }(*)`;
  static collectionAuthor: string = 'author:authorid(username,id)';
  static collectionModule: string = `module:modules!module_collection_entries_module_id_fkey(
    id,
    name,
    description,
    hp,
    public,
    manufacturer:manufacturerId(name,id),
    standard:standards!modules_standard_fkey(name,id),
    panels:${ DbPaths.module_panels }!module_panels_moduleid_fkey(*),
    created,
    updated
  )`;
  static collectionEntryModule: string = `module:modules!module_collection_entries_module_id_fkey(
    id,
    name,
    description,
    hp,
    public,
    manufacturer:manufacturerId(name,id),
    standard:standards!modules_standard_fkey(name,id),
    ${ QueryJoins.module_tags },
    panels:${ DbPaths.module_panels }!module_panels_moduleid_fkey(id,color,filename)
  )`;

  // Module Inputs
  static ins: string = `ins:${ DbPaths.moduleINs }(*)`;

  // Module Outputs
  static outs: string = `outs:${ DbPaths.moduleOUTs }(*)`;

  // Module Inputs and Outputs
  static insOuts: string = `ins:${ DbPaths.moduleINs }(*), outs:${ DbPaths.moduleOUTs }(*)`;

  // Ins/Outs (id + name only — patch graph rendering doesn't need CV metadata)
  static insOutsMinimal: string = `ins:${ DbPaths.moduleINs }(id,name), outs:${ DbPaths.moduleOUTs }(id,name)`;

  // Current-user rack list columns (rack-micro card + linked-rack selector only read
  // these; locked is a rack-detail/editor-only field, and the scalar
  // authorid column is redundant with the joined author.id below).
  static currentUserRackListColumns: string = 'id,name,description,hp,rows,image,public,public_id,created,updated';

}
