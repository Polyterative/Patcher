import { TagType } from 'src/app/models/tag';
import { MinimalModule } from 'src/app/models/module';
import { PatchMinimal } from 'src/app/models/patch';
import { RackMinimal } from 'src/app/models/rack';
import { CV } from 'src/app/models/cv';
import { PatchModuleInstance } from 'src/app/models/connection';


describe('TagType enum', () => {
  it('has numeric values 0, 1, 2', () => {
    expect(TagType.Purpose).toBe(0);
    expect(TagType.Nature).toBe(1);
    expect(TagType.Character).toBe(2);
  });
  
  it('is a bi-directional enum (reverse mapping works)', () => {
    expect(TagType[0]).toBe('Purpose');
    expect(TagType[1]).toBe('Nature');
    expect(TagType[2]).toBe('Character');
  });
});


describe('MinimalModule interface shape', () => {
  it('can be created with required fields', () => {
    const m: MinimalModule = {
      id: 1,
      name: 'Rings',
      description: '',
      hp: 8,
      public: true,
      manufacturer: {id: 1, name: 'Mutable Instruments'},
      manufacturerId: 1,
      standard: {id: 0, name: '3U'},
      tags: [],
      panels: [],
      created: '2024-01-01T00:00:00.000Z',
      updated: '2024-01-01T00:00:00.000Z'
    };
    expect(m.id).toBe(1);
    expect(m.name).toBe('Rings');
    expect(m.tags).toEqual([]);
  });
});


describe('PatchMinimal interface shape', () => {
  it('can be created with required fields', () => {
    const p: PatchMinimal = {
      id: 10,
      name: 'My Patch',
      public: true,
      author: {id: 'user-1', username: 'alice', email: 'alice@example.com'},
      created: '2024-01-01T00:00:00.000Z',
      updated: '2024-01-01T00:00:00.000Z'
    };
    expect(p.id).toBe(10);
    expect(p.author.username).toBe('alice');
  });
});


describe('RackMinimal interface shape', () => {
  it('can be created with required fields', () => {
    const r: RackMinimal = {
      id: 5,
      name: 'My Rack',
      hp: 84,
      rows: 3,
      public: true,
      author: {id: 'user-1', username: 'bob', email: 'bob@example.com'},
      locked: false,
      created: '2024-01-01T00:00:00.000Z',
      updated: '2024-01-01T00:00:00.000Z'
    };
    expect(r.hp).toBe(84);
    expect(r.rows).toBe(3);
    expect(r.locked).toBeFalse();
  });
});


describe('CV interface shape', () => {
  it('can be created with minimum required fields', () => {
    const cv: CV = {id: 1, name: 'Audio In'};
    expect(cv.id).toBe(1);
    expect(cv.name).toBe('Audio In');
    expect(cv.isAudio).toBeUndefined();
  });
  
  it('accepts optional flags', () => {
    const cv: CV = {id: 2, name: 'V/Oct', isVOCT: true, isDCC: false};
    expect(cv.isVOCT).toBeTrue();
    expect(cv.isDCC).toBeFalse();
  });
});


describe('PatchModuleInstance interface shape', () => {
  it('can be created with required fields', () => {
    const pmi: PatchModuleInstance = {
      id: 1,
      patch_id: 10,
      module_id: 99,
      instance_label: 'Osc 1'
    };
    expect(pmi.instance_label).toBe('Osc 1');
    expect(pmi.module).toBeUndefined();
  });
  
  it('accepts null instance_label', () => {
    const pmi: PatchModuleInstance = {
      id: 2,
      patch_id: 10,
      module_id: 100,
      instance_label: null
    };
    expect(pmi.instance_label).toBeNull();
  });
});