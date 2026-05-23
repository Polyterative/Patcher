import { TagType } from 'src/app/models/tag';
import { MinimalModule } from 'src/app/models/module';
import { PatchMinimal } from 'src/app/models/patch';
import { RackMinimal } from 'src/app/models/rack';
import { CV } from 'src/app/models/cv';
import { PatchModuleInstance } from 'src/app/models/connection';


describe('TagType enum', () => {
  it('has numeric values 1–9 (type 0 retired)', () => {
    expect(TagType.Nature).toBe(1);
    expect(TagType.Character).toBe(2);
    expect(TagType.Voice).toBe(3);
    expect(TagType.Source).toBe(4);
    expect(TagType.Filter).toBe(5);
    expect(TagType.Modulation).toBe(6);
    expect(TagType.Effect).toBe(7);
    expect(TagType.Sequencing).toBe(8);
    expect(TagType.Utility).toBe(9);
  });
  
  it('is a bi-directional enum (reverse mapping works)', () => {
    expect(TagType[1]).toBe('Nature');
    expect(TagType[2]).toBe('Character');
    expect(TagType[3]).toBe('Voice');
    expect(TagType[4]).toBe('Source');
    expect(TagType[5]).toBe('Filter');
    expect(TagType[6]).toBe('Modulation');
    expect(TagType[7]).toBe('Effect');
    expect(TagType[8]).toBe('Sequencing');
    expect(TagType[9]).toBe('Utility');
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
      author: {id: 'user-1', username: 'alice'},
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
      author: {id: 'user-1', username: 'bob'},
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