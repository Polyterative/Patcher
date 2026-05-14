import { generatePatchName } from './patch-name-generator';


describe('generatePatchName', () => {
  it('returns a capitalized two-word patch name', () => {
    const name = generatePatchName();
    const words = name.split(' ').filter(Boolean);

    expect(words.length).toBe(2);
    words.forEach(word => {
      expect(word[0]).toMatch(/[A-Z]/);
    });
  });

  it('returns a string with exactly one space separating two words', () => {
    const name = generatePatchName();
    const parts = name.split(' ');
    expect(parts.length).toBe(2);
    parts.forEach(part => expect(part.length).toBeGreaterThan(0));
  });

  it('produces varying names across multiple calls', () => {
    const names = new Set(Array.from({length: 30}, () => generatePatchName()));
    expect(names.size).toBeGreaterThan(1);
  });

  it('every name is a non-empty string', () => {
    for (let i = 0; i < 10; i++) {
      const name = generatePatchName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
