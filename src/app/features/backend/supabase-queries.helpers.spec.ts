import {
  applyClientSideSearchFilter,
  escapeIlikePattern,
  getHpBandLabel,
  isOneUStandard
} from './supabase-queries.helpers';


describe('supabase query helpers', () => {
  it('filters client-side rows while preserving response metadata', () => {
    const response = {
      data: [
        {id: 1, name: 'Maths'},
        {id: 2, name: 'Plaits'},
        {id: 3, name: 'Rings'}
      ],
      count: 3,
      status: 200
    };

    const result = applyClientSideSearchFilter(
      response,
      0,
      1,
      row => row.name.includes('i')
    );

    expect(result.data).toEqual([
      {id: 2, name: 'Plaits'},
      {id: 3, name: 'Rings'}
    ]);
    expect(result.count).toBe(2);
    expect(result.status).toBe(200);
  });

  it('escapes PostgREST ilike pattern characters', () => {
    expect(escapeIlikePattern('50%_gain\\trim')).toBe('50\\%\\_gain\\\\trim');
  });

  it('maps hp values into stable bands', () => {
    expect(getHpBandLabel(2)).toBe('0-2 HP');
    expect(getHpBandLabel(5)).toBe('3-5 HP');
    expect(getHpBandLabel(8)).toBe('6-8 HP');
    expect(getHpBandLabel(16)).toBe('9-16 HP');
    expect(getHpBandLabel(28)).toBe('17-28 HP');
    expect(getHpBandLabel(42)).toBe('29+ HP');
  });

  it('detects 1U standards by name', () => {
    expect(isOneUStandard('Intellijel 1U')).toBeTrue();
    expect(isOneUStandard('Pulp Logic 1U')).toBeTrue();
    expect(isOneUStandard('Eurorack 3U')).toBeFalse();
  });
});
