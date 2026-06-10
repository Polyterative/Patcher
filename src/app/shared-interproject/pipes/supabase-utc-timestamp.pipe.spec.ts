import {
  normalizeSupabaseUtcTimestamp,
  SupabaseUtcTimestampPipe
} from './supabase-utc-timestamp.pipe';


describe('SupabaseUtcTimestampPipe', () => {
  it('marks naive ISO timestamps as UTC', () => {
    expect(normalizeSupabaseUtcTimestamp('2026-06-10T20:37:21')).toBe('2026-06-10T20:37:21Z');
  });
  
  it('parses a naive backend timestamp as the exact UTC instant', () => {
    const normalized = normalizeSupabaseUtcTimestamp('2026-06-10T20:37:21');
    
    expect(Date.parse(normalized)).toBe(Date.UTC(2026, 5, 10, 20, 37, 21));
  });
  
  it('marks naive ISO timestamps with fractional seconds as UTC', () => {
    expect(normalizeSupabaseUtcTimestamp('2026-06-10T20:37:21.396123')).toBe('2026-06-10T20:37:21.396123Z');
  });
  
  it('preserves timestamps that already include UTC timezone metadata', () => {
    expect(normalizeSupabaseUtcTimestamp('2026-06-10T20:37:21Z')).toBe('2026-06-10T20:37:21Z');
  });
  
  it('preserves timestamps that already include timezone offsets', () => {
    expect(normalizeSupabaseUtcTimestamp('2026-06-10T22:37:21+02:00')).toBe('2026-06-10T22:37:21+02:00');
  });
  
  it('preserves non-Supabase timestamp values', () => {
    const date = new Date('2026-06-10T20:37:21Z');
    
    expect(normalizeSupabaseUtcTimestamp(date)).toBe(date);
    expect(normalizeSupabaseUtcTimestamp(1000)).toBe(1000);
    expect(normalizeSupabaseUtcTimestamp(null)).toBeNull();
    expect(normalizeSupabaseUtcTimestamp(undefined)).toBeUndefined();
    expect(normalizeSupabaseUtcTimestamp('Wed Jun 10 2026 17:32:07 GMT+0200')).toBe('Wed Jun 10 2026 17:32:07 GMT+0200');
  });
  
  it('is available as an Angular pipe', () => {
    const pipe = new SupabaseUtcTimestampPipe();
    
    expect(pipe.transform('2026-06-10T20:37:21')).toBe('2026-06-10T20:37:21Z');
  });
});
