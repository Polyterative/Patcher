import { CalculateRowInformationPipe } from './calculate-row-information.pipe';
import { RackedModule } from 'src/app/models/module';

const makeRackedModule = (id: number, hp: number, row = 0, col = 0): RackedModule => ({
  module: { id, hp, name: '', description: '', manufacturer_id: 1, depth: 30, powerPos12: null, powerNeg12: null, powerPos5: null } as any,
  rackingData: { id: 1, row, column: col, rackid: 1, moduleid: id } as any
});

describe('CalculateRowInformationPipe', () => {
  let pipe: CalculateRowInformationPipe;

  beforeEach(() => {
    pipe = new CalculateRowInformationPipe();
  });

  it('creates', () => expect(pipe).toBeTruthy());

  it('returns "Total HP: 0" for empty row', () => {
    expect(pipe.transform([])).toBe('Total HP: 0');
  });

  it('sums hp of all modules in row', () => {
    const row = [makeRackedModule(1, 4), makeRackedModule(2, 6)];
    expect(pipe.transform(row)).toBe('Total HP: 10');
  });

  it('single module hp is returned', () => {
    expect(pipe.transform([makeRackedModule(1, 8)])).toBe('Total HP: 8');
  });

  it('handles row with multiple modules of same hp', () => {
    const row = [makeRackedModule(1, 4), makeRackedModule(2, 4), makeRackedModule(3, 4)];
    expect(pipe.transform(row)).toBe('Total HP: 12');
  });
});
