/**
 * WCAG 2.1 color contrast utilities.
 * Pure TypeScript implementation — no external dependencies.
 */

/**
 * Parse a 6-digit hex color string (with or without #) into [R, G, B] in 0–255.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) {
    throw new Error(`Invalid hex color: "${hex}". Expected 6-digit hex.`);
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b];
}

/**
 * Convert an sRGB channel value (0–255) to linear RGB (0–1).
 * Per WCAG 2.1 relative luminance definition.
 */
export function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Calculate relative luminance of a hex color per WCAG 2.1.
 * Returns a value between 0 (black) and 1 (white).
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/**
 * Calculate contrast ratio between two hex colors per WCAG 2.1.
 * Returns a value between 1 (identical) and 21 (black vs white).
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color pair meets WCAG AA for normal text (ratio >= 4.5:1).
 */
export function meetsWcagAA(hex1: string, hex2: string): boolean {
  return contrastRatio(hex1, hex2) >= 4.5;
}

/**
 * Suggest the best text color (white or black) for a given background color.
 * Returns whichever provides a higher contrast ratio.
 */
export function suggestTextColor(backgroundHex: string): '#ffffff' | '#000000' {
  const whiteContrast = contrastRatio(backgroundHex, '#ffffff');
  const blackContrast = contrastRatio(backgroundHex, '#000000');
  return whiteContrast >= blackContrast ? '#ffffff' : '#000000';
}
