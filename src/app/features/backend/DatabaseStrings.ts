export class DbPaths {
  // Manufacturer staticant
  static modules: string = 'modules';
  static moduleINs: string = 'module_ins';
  static moduleOUTs: string = 'module_outs';
  static manufacturers: string = 'manufacturers';
  static user_modules: string = 'user_modules';
  static racks: string = 'racks';
  static rack_modules: string = 'rack_modules';
  static rack_modules_grouped_by_moduleid: string = 'rack_modules_grouped_by_moduleid';
  static patches_for_modules: string = 'patches_for_modules';
  static patches: string = 'patches';
  static patch_connections: string = 'patch_connections';
  static module_tags: string = 'module_tags';
  static module_panels: string = 'module_panels';
  static tags: string = 'tags';
  static standards: string = 'standards';
  static profiles: string = 'profiles';
  static comments: string = 'comments';
  
}

export class QueryJoins {
  // Manufacturer staticant
  static manufacturer: string = 'manufacturer:manufacturerId(name,id,logo)';

// Standard staticant
  static standard: string = 'standard:standards!modules_standards_id_fk(name,id)';

// Patch staticant
  static patch: string = 'patch:patches!patch_connections_patchid_fkey(*)';

// Author staticant
  static author: string = 'author:authorid(username,id,email)';

// Rack staticant
  static rack: string = 'rack:rackid(*,author:authorid(username,id,email))';

// Rack Modules staticant
  static rackModules: string = 'rackModules:rackid(*)';

// Module Foreign Key in Rack Modules staticant
  static module_fk_rackmodules: string = 'module:modules!rack_modules_moduleid_fkey(id,name,hp,manufacturer:manufacturerId(name,id),standard:standards!modules_standards_id_fk(name,id),panels:module_panels!module_panels_moduleid_fkey(*)))';

// Module Tags staticant
  static module_tags: string = `tags:${ DbPaths.module_tags }(tag:${ DbPaths.tags }(*))`;

// Module Panels staticant
  static module_panels: string = `panels:${ DbPaths.module_panels }!module_panels_moduleid_fkey(*)`;

// Module Inputs staticant
  static ins: string = `ins:${ DbPaths.moduleINs }(*)`;

// Module Outputs staticant
  static outs: string = `outs:${ DbPaths.moduleOUTs }(*)`;

// Module Inputs and Outputs staticant
  static insOuts: string = `ins:${ DbPaths.moduleINs }(*), outs:${ DbPaths.moduleOUTs }(*)`;
  
}

//
// private readonly queryJoins = {
//   // [simple syntax]: responseObjectName:tableName(*columns*)
//   // [advanced syntax]: responseObjectName:tableName(*columns*,responseObjectName:tableName(*columns*))
//   // [specific syntax]: responseObjectName:tableName!foreignKeyName(*columns*,responseObjectName:tableName!foreignKeyName(*columns*))
//   //
//   // a(*,module:modules!moduleOUTs_moduleId_fkey(*, ${ this.queryJoins.manufacturer })),
//  
//   manufacturer: 'manufacturer:manufacturerId(name,id,logo)',
//   standard: 'standard:standards!modules_standards_id_fk(name,id)',
//   patch: 'patch:patches!patch_connections_patchid_fkey(*)',
//   author: 'author:authorid(username,id,email)',
//   rack: 'rack:rackid(*,author:authorid(username,id,email))',
//   rack_modules: 'rackModules:rackid(*)',
//   module_fk_rackmodules: 'module:modules!rack_modules_moduleid_fkey(id,name,hp,manufacturer:manufacturerId(name,id),standard:standards!modules_standards_id_fk(name,id),panels:module_panels!module_panels_moduleid_fkey(*)))',
//   // module:       'module:moduleid(*,manufacturer:manufacturerId(name,id,logo))',
//   module_tags: `tags:${ this.paths.module_tags }(tag:${ this.paths.tags }(*))`,
//   module_panels: `panels:${ this.paths.module_panels }!module_panels_moduleid_fkey(*)`,
//   ins: `ins:${ this.paths.moduleINs }(*)`,
//   outs: `outs:${ this.paths.moduleOUTs }(*)`,
//   insOuts: `ins:${ this.paths.moduleINs }(*), outs:${ this.paths.moduleOUTs }(*)`
// };


// private paths = {
//   modules: 'modules',
//   moduleINs: 'module_ins',
//   moduleOUTs: 'module_outs',
//   manufacturers: 'manufacturers',
//   user_modules: 'user_modules',
//   racks: 'racks',
//   rack_modules: 'rack_modules',
//   rack_modules_grouped_by_moduleid: 'rack_modules_grouped_by_moduleid', // this is a view on DB
//   patches_for_modules: 'patches_for_modules', // this is a view on DB
//   patches: 'patches',
//   patch_connections: 'patch_connections',
//   module_tags: 'module_tags',
//   module_panels: 'module_panels',
//   tags: 'tags',
//   standards: 'standards',
//   profiles: 'profiles'
// };