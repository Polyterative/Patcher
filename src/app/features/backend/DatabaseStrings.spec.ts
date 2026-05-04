import {
  DbPaths,
  DbStoragePaths,
  QueryJoins
} from './DatabaseStrings';


describe('DbPaths', () => {
  it('exposes correct table name strings', () => {
    expect(DbPaths.modules).toBe('modules');
    expect(DbPaths.manufacturers).toBe('manufacturers');
    expect(DbPaths.racks).toBe('racks');
    expect(DbPaths.patches).toBe('patches');
    expect(DbPaths.patch_connections).toBe('patch_connections');
    expect(DbPaths.module_tags).toBe('module_tags');
    expect(DbPaths.tags).toBe('tags');
    expect(DbPaths.profiles).toBe('profiles');
    expect(DbPaths.comments).toBe('comments');
  });
  
  it('all path values are non-empty strings', () => {
    const keys = Object.getOwnPropertyNames(DbPaths).filter(k => k !== 'prototype' && k !== 'length' && k !== 'name');
    for (const key of keys) {
      const value = (DbPaths as any)[key];
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});


describe('DbStoragePaths', () => {
  it('exposes storage bucket name strings', () => {
    expect(DbStoragePaths.module_panels).toBe('module-panels');
    expect(DbStoragePaths.racks).toBe('racks');
  });
});


describe('QueryJoins', () => {
  it('manufacturer join string contains the expected alias and table reference', () => {
    expect(QueryJoins.manufacturer).toContain('manufacturer');
    expect(QueryJoins.manufacturer).toContain('manufacturerId');
  });
  
  it('standard join string references the standards table', () => {
    expect(QueryJoins.standard).toContain('standards');
  });
  
  it('author join string references authorid', () => {
    expect(QueryJoins.author).toContain('authorid');
  });
  
  it('insOuts join string contains both ins and outs', () => {
    expect(QueryJoins.insOuts).toContain('ins');
    expect(QueryJoins.insOuts).toContain('outs');
  });
  
  it('module_tags join references the tags table', () => {
    expect(QueryJoins.module_tags).toContain('tags');
  });

  it('rack-module module join includes module tags for downstream rack analysis', () => {
    expect(QueryJoins.module_fk_rackmodules).toContain('tags:module_tags');
    expect(QueryJoins.module_fk_rackmodules).toContain('voteCount:user_module_tags');
    expect(QueryJoins.module_fk_rackmodules).toContain('ins:module_ins');
    expect(QueryJoins.module_fk_rackmodules).toContain('outs:module_outs');
  });
  
  it('module_panels join string contains the module_panels table reference', () => {
    expect(QueryJoins.module_panels).toContain('module_panels');
  });
});
