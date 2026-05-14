import { mapProfile, toLimitedProfile } from './public-profile-data.utils';

describe('public-profile-data.utils', () => {
  describe('mapProfile', () => {
    it('returns null for null input', () => {
      expect(mapProfile(null)).toBeNull();
    });

    it('returns null when id missing', () => {
      expect(mapProfile({ username: 'user' })).toBeNull();
    });

    it('returns null when username missing', () => {
      expect(mapProfile({ id: 'abc' })).toBeNull();
    });

    it('maps full profile correctly', () => {
      const raw = { id: 'abc', username: 'alice', public: true, website: 'https://a.com', avatar_url: 'img.jpg' };
      const result = mapProfile(raw);
      expect(result?.id).toBe('abc');
      expect(result?.username).toBe('alice');
      expect(result?.public).toBeTrue();
      expect(result?.website).toBe('https://a.com');
      expect(result?.avatarUrl).toBe('img.jpg');
    });

    it('uses null fallback for missing optional fields', () => {
      const raw = { id: 'abc', username: 'alice' };
      const result = mapProfile(raw);
      expect(result?.website).toBeNull();
      expect(result?.avatarUrl).toBeNull();
    });

    it('maps public as boolean coercion', () => {
      const result = mapProfile({ id: 'abc', username: 'bob', public: 0 });
      expect(result?.public).toBeFalse();
    });
  });

  describe('toLimitedProfile', () => {
    it('strips website and avatarUrl', () => {
      const profile = { id: 'abc', username: 'alice', public: true, website: 'site.com', avatarUrl: 'img.jpg' };
      const limited = toLimitedProfile(profile);
      expect(limited.website).toBeNull();
      expect(limited.avatarUrl).toBeNull();
      expect(limited.id).toBe('abc');
      expect(limited.username).toBe('alice');
    });
  });
});

