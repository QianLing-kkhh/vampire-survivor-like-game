export function estimateTextWidth(text: string, fontSizePx: number): number {
  let units = 0;

  for (const char of Array.from(text)) {
    units += isWideGlyph(char) ? 0.95 : 0.58;
  }

  return units * fontSizePx;
}

export function truncateTextToWidth(text: string, width: number, fontSize: string | number): string {
  const fontPixels = typeof fontSize === 'number'
    ? fontSize
    : Number.parseInt(fontSize, 10) || 12;
  const maxUnits = Math.max(3, width / Math.max(1, fontPixels));
  let usedUnits = 0;
  let output = '';
  const ellipsis = '...';
  const ellipsisUnits = 1.7;

  for (const char of Array.from(text)) {
    const charUnits = isWideGlyph(char) ? 1 : 0.56;

    if (usedUnits + charUnits + ellipsisUnits > maxUnits) {
      return output.length > 0 && output.length < text.length ? `${output}${ellipsis}` : text;
    }

    output += char;
    usedUnits += charUnits;
  }

  return text;
}

function isWideGlyph(char: string): boolean {
  return /[\u2e80-\uffff]/.test(char);
}
