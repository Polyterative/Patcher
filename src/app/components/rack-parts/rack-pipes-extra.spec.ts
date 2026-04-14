import { RackedModule } from '../../models/module';
import { RackedToModulesPipe } from './racked-to-modules.pipe';
import { TotalHpOfModulesPipe } from './total-hp-of-modules.pipe';
import { CalculateRowInformationPipe } from './rack-editor/calculate-row-information.pipe';


function makeRackedModule(id: number, hp: number): RackedModule {
  return {
    module: {id, hp, name: `Module ${ id }`} as any,
    rackingData: {id: 0, rackid: 1, moduleid: id, row: 0, column: 0} as any
  };
}


describe('RackedToModulesPipe', () => {
  let pipe: RackedToModulesPipe;
  
  beforeEach(() => {
    pipe = new RackedToModulesPipe();
  });
  
  it('extracts module objects from racked modules', () => {
    const result = pipe.transform([makeRackedModule(1, 4), makeRackedModule(2, 8)]);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });
  
  it('returns empty array for empty input', () => {
    expect(pipe.transform([])).toEqual([]);
  });
  
  it('preserves order of modules', () => {
    const result = pipe.transform([makeRackedModule(10, 4), makeRackedModule(5, 8), makeRackedModule(20, 2)]);
    expect(result.map(m => m.id)).toEqual([10, 5, 20]);
  });
});


describe('TotalHpOfModulesPipe', () => {
  let pipe: TotalHpOfModulesPipe;
  
  beforeEach(() => {
    pipe = new TotalHpOfModulesPipe();
  });
  
  it('sums HP of all modules', () => {
    expect(pipe.transform([makeRackedModule(1, 4), makeRackedModule(2, 8), makeRackedModule(3, 2)])).toBe(14);
  });
  
  it('returns 0 for empty array', () => {
    expect(pipe.transform([])).toBe(0);
  });
  
  it('handles single module', () => {
    expect(pipe.transform([makeRackedModule(1, 12)])).toBe(12);
  });

  it('prefers hp overrides when present', () => {
    const overridden = makeRackedModule(1, 4);
    overridden.rackingData.hpOverride = 10;
    expect(pipe.transform([overridden, makeRackedModule(2, 8)])).toBe(18);
  });
});


describe('CalculateRowInformationPipe', () => {
  let pipe: CalculateRowInformationPipe;
  
  beforeEach(() => {
    pipe = new CalculateRowInformationPipe();
  });
  
  it('calculates total HP for a row', () => {
    expect(pipe.transform([makeRackedModule(1, 4), makeRackedModule(2, 8)])).toBe('Total HP: 12');
  });
  
  it('returns 0 total HP for empty row', () => {
    expect(pipe.transform([])).toBe('Total HP: 0');
  });
  
  it('sums all modules including blanks', () => {
    expect(pipe.transform([makeRackedModule(1, 4), makeRackedModule(4647, 2)])).toBe('Total HP: 6');
  });
  
  it('handles single module row', () => {
    expect(pipe.transform([makeRackedModule(1, 6)])).toBe('Total HP: 6');
  });

  it('uses hp overrides when calculating row totals', () => {
    const overridden = makeRackedModule(1, 4);
    overridden.rackingData.hpOverride = 10;
    expect(pipe.transform([overridden, makeRackedModule(2, 8)])).toBe('Total HP: 18');
  });
});
