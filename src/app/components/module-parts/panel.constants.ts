export const PANEL_COLORS: Record<number, string> = {
  1: 'Light',
  2: 'Dark',
  3: 'Special edition',
  4: 'Limited edition',
};

export function derivePanelLabel(filename: string, description: string | null | undefined, index: number): string {
  if (description?.trim()) return description.trim();
  const base = filename?.replace(/\.[^.]+$/, '') ?? '';
  const segments = base.split(/[-_]/);
  const keywords = ['dark', 'light', 'black', 'white', 'silver', 'gold', 'red', 'blue', 'green', 'alt', 'v2', 'mk2', 'mk1'];
  for (let i = segments.length - 1; i >= 0; i--) {
    if (keywords.includes(segments[i].toLowerCase())) {
      return segments[i].charAt(0).toUpperCase() + segments[i].slice(1).toLowerCase();
    }
  }
  return `Panel ${  index + 1}`;
}
