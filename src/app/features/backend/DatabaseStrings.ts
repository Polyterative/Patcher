export class DbPaths {
  // Manufacturer
  static modules = 'modules' as const;
  static moduleINs = 'module_ins' as const;
  static moduleOUTs = 'module_outs' as const;
  static manufacturers = 'manufacturers' as const;
  static user_modules = 'user_modules' as const;
  static user_module_acquisitions = 'user_module_acquisitions' as const;
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

}

export class DbStoragePaths {
  static module_panels = 'module-panels' as const;
  static racks = 'racks' as const;
  static patches = 'patches' as const;
  static manufacturer_logos = 'manufacturer-logos' as const;
  static module_collections = 'module-collections' as const;
}

const SUPABASE_STORAGE_BASE = 'https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/';

/** Ready-to-use public base URLs for each storage bucket. Append a filename to get a full asset URL. */
export class StorageUrls {
  static modulePanels = `${SUPABASE_STORAGE_BASE}${DbStoragePaths.module_panels}/`;
  static manufacturerLogos = `${SUPABASE_STORAGE_BASE}${DbStoragePaths.manufacturer_logos}/`;
  static moduleCollections = `${SUPABASE_STORAGE_BASE}${DbStoragePaths.module_collections}/`;
  static racks = `${SUPABASE_STORAGE_BASE}${DbStoragePaths.racks}/`;
  static patches = `${SUPABASE_STORAGE_BASE}${DbStoragePaths.patches}/`;
}

export class QueryJoins {
  // Manufacturer
  static manufacturer: string = 'manufacturer:manufacturerId(name,id,logo)';

  // Standard
  static standard: string = 'standard:standards!modules_standard_fkey(name,id)';

  // Patch
  static patch: string = 'patch:patches!patch_connections_patchid_fkey(*)';

  // Patch Connections
  static patch_connections: string = 'patch_connections:patch_connections!patch_connections_patchid_fkey(*)';

  // Author
  static author: string = 'author:authorid(username,id)';
  static publicAuthorGate(alias = 'author_profile_gate'): string {
    return `${ alias }:authorid!inner(public)`;
  }

  // Rack
  static rack: string = 'rack:rackid(*,author:authorid(username,id))';

  // Rack Modules
  static rackModules: string = 'rackModules:rackid(*)';

  // Module Foreign Key in Rack Modules
  static module_fk_rackmodules: string = `module:modules!rack_modules_moduleid_fkey(
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
    tags:${ DbPaths.module_tags }(id,tag:${ DbPaths.tags }(*),voteCount:${ DbPaths.user_module_tags }(moduletagid)),
    panels:module_panels!module_panels_moduleid_fkey(*),
    ins:${ DbPaths.moduleINs }(*),
    outs:${ DbPaths.moduleOUTs }(*)
  )`;

  // Module Tags
  static module_tags: string = `tags:${ DbPaths.module_tags }(id,tag:${ DbPaths.tags }(*),voteCount:${ DbPaths.user_module_tags }(moduletagid))`;

  // Module Panels
  static module_panels: string = `panels:${ DbPaths.module_panels }!module_panels_moduleid_fkey(*)`;

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
    panels:${ DbPaths.module_panels }!module_panels_moduleid_fkey(*),
    created,
    updated
  )`;

  // Module Inputs
  static ins: string = `ins:${ DbPaths.moduleINs }(*)`;

  // Module Outputs
  static outs: string = `outs:${ DbPaths.moduleOUTs }(*)`;

  // Module Inputs and Outputs
  static insOuts: string = `ins:${ DbPaths.moduleINs }(*), outs:${ DbPaths.moduleOUTs }(*)`;
  
}
