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
});
