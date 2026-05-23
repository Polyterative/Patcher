export enum TagType {
  Nature = 1, Character = 2, Voice = 3,
  Source = 4, Filter = 5, Modulation = 6,
  Effect = 7, Sequencing = 8, Utility = 9,
}

export interface Tag {
  id: number;
  name: string;
  type: TagType;
}

export interface TagSuggestionGroup {
  label: string;
  tags: Tag[];
}

export const TAG_TYPE_LABELS: Record<TagType, string> = {
  [TagType.Nature]: 'Nature',
  [TagType.Character]: 'Character',
  [TagType.Voice]: 'Voice',
  [TagType.Source]: 'Source',
  [TagType.Filter]: 'Filter',
  [TagType.Modulation]: 'Modulation',
  [TagType.Effect]: 'Effect',
  [TagType.Sequencing]: 'Sequencing',
  [TagType.Utility]: 'Utility',
};

export const TAG_TYPE_DISPLAY_ORDER: TagType[] = [
  TagType.Utility,
  TagType.Modulation,
  TagType.Source,
  TagType.Filter,
  TagType.Sequencing,
  TagType.Effect,
  TagType.Nature,
  TagType.Character,
  TagType.Voice,
];

/**
 * Maps numeric tag type IDs (as stored in DB) to lowercase string names.
 * Derived automatically from TAG_TYPE_LABELS — adding a new TagType value
 * and its label here is the only change needed to support a new type everywhere.
 */
export const NUMERIC_TAG_TYPE_NAMES: Readonly<Record<number, string>> = Object.fromEntries(
  (Object.entries(TAG_TYPE_LABELS) as [string, string][])
    .map(([k, v]) => [Number(k), v.toLowerCase()])
);

/**
 * Tag types that represent the functional role of a module in the signal chain
 * (replaced the retired type 0 / 'purpose'). Used for balance analysis scoring.
 */
export const FUNCTIONAL_TAG_TYPES: ReadonlySet<string> = new Set([
  TagType.Source, TagType.Filter, TagType.Modulation,
  TagType.Effect, TagType.Sequencing, TagType.Utility,
].map(t => TAG_TYPE_LABELS[t].toLowerCase()));

/**
 * Legacy string tag-type names that may appear in old cached backend payloads.
 * Treated as functional types for backward compatibility.
 */
export const TAG_TYPE_LEGACY_FUNCTIONAL: ReadonlySet<string> = new Set(['purpose', 'function', 'module_type']);

/**
 * Normalises a tag name for fuzzy matching: lowercase, collapse whitespace,
 * expand '&' to 'and', strip non-alphanumeric characters.
 */
export function normalizeTagName(tagName: string): string {
  return tagName
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts a raw tag type value (number from DB or legacy string) to a
 * canonical lowercase string name, or null if unrecognised.
 */
export function normalizeTagType(tagType: unknown): string | null {
  if (typeof tagType === 'string') return tagType.trim().toLowerCase();
  if (typeof tagType === 'number') return NUMERIC_TAG_TYPE_NAMES[tagType] ?? null;
  return null;
}

/**
 * Returns true when a tag type string should be considered a functional
 * (signal-chain role) type for balance analysis purposes.
 */
export function isFunctionalTagType(tagType: string | null): boolean {
  return tagType !== null
    && (FUNCTIONAL_TAG_TYPES.has(tagType) || TAG_TYPE_LEGACY_FUNCTIONAL.has(tagType));
}
