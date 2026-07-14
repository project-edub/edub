import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  srgbToLinear,
  relativeLuminance,
  contrastRatio,
  meetsWcagAA,
  suggestTextColor,
} from './colorContrast';

describe('hexToRgb', () => {
  it('parses a 6-digit hex with #', () => {
    expect(hexToRgb('#ff8800')).toEqual([255, 136, 0]);
  });

  it('parses a 6-digit hex without #', () => {
    expect(hexToRgb('1976d2')).toEqual([25, 118, 210]);
  });

  it('parses black', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
  });

  it('parses white', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
  });

  it('throws on invalid hex', () => {
    expect(() => hexToRgb('#zz0000')).toThrow();
  });
});

describe('srgbToLinear', () => {
  it('returns 0 for channel value 0', () => {
    expect(srgbToLinear(0)).toBe(0);
  });

  it('returns 1 for channel value 255', () => {
    expect(srgbToLinear(255)).toBeCloseTo(1, 4);
  });

  it('uses linear formula for low values (<=0.03928 * 255 ≈ 10)', () => {
    // Channel 10 → 10/255 = 0.0392... which is ≈ 0.03928 boundary
    const c = 10 / 255; // ~0.0392
    const expected = c / 12.92;
    expect(srgbToLinear(10)).toBeCloseTo(expected, 6);
  });

  it('uses gamma formula for higher values', () => {
    // Channel 128 → 128/255 ≈ 0.502
    const c = 128 / 255;
    const expected = ((c + 0.055) / 1.055) ** 2.4;
    expect(srgbToLinear(128)).toBeCloseTo(expected, 6);
  });
});

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    expect(relativeLuminance('#000000')).toBe(0);
  });

  it('returns 1 for white', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 4);
  });

  it('returns ~0.2126 for pure red', () => {
    expect(relativeLuminance('#ff0000')).toBeCloseTo(0.2126, 4);
  });

  it('returns ~0.7152 for pure green', () => {
    expect(relativeLuminance('#00ff00')).toBeCloseTo(0.7152, 4);
  });

  it('returns ~0.0722 for pure blue', () => {
    expect(relativeLuminance('#0000ff')).toBeCloseTo(0.0722, 4);
  });
});

describe('contrastRatio', () => {
  it('returns 21:1 for black and white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for identical colors', () => {
    expect(contrastRatio('#1976d2', '#1976d2')).toBeCloseTo(1, 4);
  });

  it('is symmetric — order does not matter', () => {
    const ratio1 = contrastRatio('#1976d2', '#ffffff');
    const ratio2 = contrastRatio('#ffffff', '#1976d2');
    expect(ratio1).toBeCloseTo(ratio2, 4);
  });

  it('calculates known ratio for MUI blue (#1976d2) vs white', () => {
    // #1976d2 has luminance ~0.1446, white is 1.0
    // ratio = (1 + 0.05) / (0.1446 + 0.05) ≈ 5.4
    const ratio = contrastRatio('#1976d2', '#ffffff');
    expect(ratio).toBeGreaterThan(4.5);
    expect(ratio).toBeLessThan(6);
  });
});

describe('meetsWcagAA', () => {
  it('passes for black on white (21:1)', () => {
    expect(meetsWcagAA('#000000', '#ffffff')).toBe(true);
  });

  it('passes for dark blue on white', () => {
    expect(meetsWcagAA('#1976d2', '#ffffff')).toBe(true);
  });

  it('fails for yellow on white (low contrast)', () => {
    expect(meetsWcagAA('#ffff00', '#ffffff')).toBe(false);
  });

  it('fails for light gray on white', () => {
    expect(meetsWcagAA('#cccccc', '#ffffff')).toBe(false);
  });
});

describe('suggestTextColor', () => {
  it('suggests white text for dark backgrounds', () => {
    expect(suggestTextColor('#000000')).toBe('#ffffff');
    expect(suggestTextColor('#1976d2')).toBe('#ffffff');
    expect(suggestTextColor('#303f9f')).toBe('#ffffff');
  });

  it('suggests black text for light backgrounds', () => {
    expect(suggestTextColor('#ffffff')).toBe('#000000');
    expect(suggestTextColor('#ffff00')).toBe('#000000');
    expect(suggestTextColor('#90ee90')).toBe('#000000');
  });
});
