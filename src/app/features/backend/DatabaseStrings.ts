export class DbPaths {
  // Manufacturer
  static modules = 'modules' as const;
  static moduleINs = 'module_ins' as const;
  static moduleOUTs = 'module_outs' as const;
  static manufacturers = 'manufacturers' as const;
  static user_modules = 'user_modules' as const;
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

}

export class DbStoragePaths {
  static module_panels = 'module-panels' as const;
  static racks = 'racks' as const;
  
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

  // Module Inputs
  static ins: string = `ins:${ DbPaths.moduleINs }(*)`;

  // Module Outputs
  static outs: string = `outs:${ DbPaths.moduleOUTs }(*)`;

  // Module Inputs and Outputs
  static insOuts: string = `ins:${ DbPaths.moduleINs }(*), outs:${ DbPaths.moduleOUTs }(*)`;
  
}
