import {
  DbModule,
  RackedModule
} from '../../models/module';
import { MapToModulePipe } from './map-to-module.pipe';


describe('MapToModulePipe', () => {
  let pipe: MapToModulePipe;
  
  beforeEach(() => {
    pipe = new MapToModulePipe();
  });
  
  it('returns the module from a RackedModule', () => {
    const module = {id: 42, name: 'Test', hp: 8} as DbModule;
    const rackedModule: RackedModule = {
      rackingData: {id: 1, rackid: 1, moduleid: 42, row: 0, column: 0},
      module
    };
    expect(pipe.transform(rackedModule)).toBe(module);
  });
  
  it('returns the exact same object reference', () => {
    const module = {id: 1, name: 'VCO', hp: 14} as DbModule;
    const rackedModule: RackedModule = {
      rackingData: {id: 2, rackid: 1, moduleid: 1, row: 0, column: 0},
      module
    };
    const result = pipe.transform(rackedModule);
    expect(result).toBe(module);
  });

  it('creates pipe instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('passes through hp value from the inner module', () => {
    const module = {id: 10, name: 'Filter', hp: 12} as DbModule;
    const rackedModule: RackedModule = {
      rackingData: {id: 3, rackid: 2, moduleid: 10, row: 1, column: 0},
      module
    };
    expect(pipe.transform(rackedModule).hp).toBe(12);
  });
});