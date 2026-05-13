export function interpolateColor(fromColor: string, toColor: string, weight: number): string {
  const from = parseColor(fromColor);
  const to = parseColor(toColor);
  const t = Math.max(0, Math.min(1, weight));
  const r = Math.round(from.r + (to.r - from.r) * t);
  const g = Math.round(from.g + (to.g - from.g) * t);
  const b = Math.round(from.b + (to.b - from.b) * t);
  return `rgb(${ r }, ${ g }, ${ b })`;
}

export function parseColor(color: string): {r: number; g: number; b: number} {
  const value = color.trim();
  if (value.startsWith('#')) {
    const hex = value.replace('#', '');
    const normalized = hex.length === 3
      ? hex.split('').map(char => char + char).join('')
      : hex;
    const parsed = Number.parseInt(normalized, 16);
    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255
    };
  }

  const rgbMatch = value.match(/rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    return {
      r: Number.parseInt(rgbMatch[1], 10),
      g: Number.parseInt(rgbMatch[2], 10),
      b: Number.parseInt(rgbMatch[3], 10)
    };
  }

  return {r: 128, g: 128, b: 128};
}

export function renderNodeLabel(
  context: CanvasRenderingContext2D,
  data: {
    x: number;
    y: number;
    size: number;
    label?: string;
    color?: string;
  },
  settings: {
    labelSize: number;
    labelFont: string;
    labelWeight: string;
    labelColor: {
      attribute?: string;
      color?: string;
    };
  }
): void {
  if (!data?.label) {
    return;
  }

  const size = settings.labelSize;
  const font = settings.labelFont;
  const weight = settings.labelWeight;
  const labelColorAttribute = settings.labelColor?.attribute;
  const color = labelColorAttribute
    ? ((data as Record<string, unknown>)[labelColorAttribute] as string)
    || settings.labelColor?.color
    || '#111111'
    : settings.labelColor?.color ?? '#111111';
  const xOffset = Math.max(10, data.size * 0.85);
  const x = data.x + data.size + xOffset;
  const y = data.y + size / 3;

  context.save();
  context.font = `${ weight } ${ size }px ${ font }`;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.lineWidth = Math.max(2, size * 0.32);
  context.strokeStyle = 'rgba(255, 255, 255, 0.82)';
  context.lineJoin = 'round';
  context.strokeText(data.label, x, y);
  context.fillStyle = color;
  context.fillText(data.label, x, y);
  context.restore();
}
