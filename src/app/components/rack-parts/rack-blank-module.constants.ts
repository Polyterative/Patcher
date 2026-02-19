/**
 * Blank module IDs as stored in the database.
 * These are placeholder modules used for spacing in a rack — they should not
 * be included in any statistics (module count, HP used, power draw, weight, depth).
 *
 * 3U Eurorack blanks: IDs 4647–4666 (1 HP to 20 HP)
 * Intellijel 1U blanks: IDs 4711–4735 (1 HP to 25 HP)
 */
export const BLANK_MODULE_IDS: ReadonlySet<number> = new Set([
  // 3U Eurorack blanks (1–20 HP)
  4647, 4648, 4649, 4650, 4651, 4652, 4653, 4654, 4655, 4656,
  4657, 4658, 4659, 4660, 4661, 4662, 4663, 4664, 4665, 4666,
  // Intellijel 1U blanks (1–25 HP)
  4711, 4712, 4713, 4714, 4715, 4716, 4717, 4718, 4719, 4720,
  4721, 4722, 4723, 4724, 4725, 4726, 4727, 4728, 4729, 4730,
  4731, 4732, 4733, 4734, 4735
]);

/** Returns true if the given module ID is a system blank (spacing) module. */
export function isBlankModule(id: number): boolean {
  return BLANK_MODULE_IDS.has(id);
}