export const DEFAULT_AUTO_COMPACT_TITLE_SUB_LENGTH = 24;

export interface HeroTitleSubCompactionOptions {
  compactAtLength?: number;
}

export function shouldCompactHeroTitleSub(
  titleSub: string | null | undefined,
  options: HeroTitleSubCompactionOptions = {}
): boolean {
  const normalizedTitleSub = titleSub?.trim() ?? '';

  if (!normalizedTitleSub) {
    return false;
  }

  const compactAtLength = options.compactAtLength ?? DEFAULT_AUTO_COMPACT_TITLE_SUB_LENGTH;

  return Array.from(normalizedTitleSub).length > compactAtLength;
}
