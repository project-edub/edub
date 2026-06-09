import { describe, it, expect } from 'vitest';
import {
  calculateAverage,
  classifyScore,
  type ScoreColumnConfig,
  type ClassificationRange,
} from '../scoreCalculation';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeConfigs(
  configs: Array<{ id: number; coeff: number | null }>,
): Map<number, ScoreColumnConfig> {
  const map = new Map<number, ScoreColumnConfig>();
  for (const { id, coeff } of configs) {
    map.set(id, {
      columnId: id,
      coefficient: coeff,
      isAverageColumn: false,
      sourceColumnIds: [],
    });
  }
  return map;
}

// ── calculateAverage ──────────────────────────────────────────────────────────

describe('calculateAverage', () => {
  const columns = [
    { id: 1, name: 'Miệng' },
    { id: 2, name: 'Hs15p' },
    { id: 3, name: 'Hs1T' },
  ];

  it('calculates weighted average correctly', () => {
    const entries = { Miệng: '7', Hs15p: '8.5', Hs1T: '9' };
    const configs = makeConfigs([
      { id: 1, coeff: 1 },
      { id: 2, coeff: 1 },
      { id: 3, coeff: 2 },
    ]);

    const result = calculateAverage(entries, [1, 2, 3], columns, configs);

    // (7×1 + 8.5×1 + 9×2) / (1+1+2) = 33.5/4 = 8.375 → 8.38
    expect(result.average).toBe(8.38);
    expect(result.formula).toBe('(7×1 + 8.5×1 + 9×2) / 4 = 8.38');
  });

  it('returns null when any source column is empty', () => {
    const entries = { Miệng: '7', Hs15p: '', Hs1T: '9' };
    const configs = makeConfigs([
      { id: 1, coeff: 1 },
      { id: 2, coeff: 1 },
      { id: 3, coeff: 2 },
    ]);

    const result = calculateAverage(entries, [1, 2, 3], columns, configs);

    expect(result.average).toBeNull();
    expect(result.formula).toBe('');
  });

  it('returns null when a source column value is undefined (missing key)', () => {
    const entries = { Miệng: '7', Hs1T: '9' }; // Hs15p missing
    const configs = makeConfigs([
      { id: 1, coeff: 1 },
      { id: 2, coeff: 1 },
      { id: 3, coeff: 2 },
    ]);

    const result = calculateAverage(entries, [1, 2, 3], columns, configs);

    expect(result.average).toBeNull();
    expect(result.formula).toBe('');
  });

  it('skips non-numeric (text) column values', () => {
    const entries = { Miệng: 'Vắng', Hs15p: '8', Hs1T: '9' };
    const configs = makeConfigs([
      { id: 1, coeff: 1 },
      { id: 2, coeff: 1 },
      { id: 3, coeff: 2 },
    ]);

    const result = calculateAverage(entries, [1, 2, 3], columns, configs);

    // Skip "Vắng" → (8×1 + 9×2) / (1+2) = 26/3 = 8.666... → 8.67
    expect(result.average).toBe(8.67);
    expect(result.formula).toBe('(8×1 + 9×2) / 3 = 8.67');
  });

  it('skips columns with null coefficient', () => {
    const entries = { Miệng: '7', Hs15p: '8', Hs1T: '9' };
    const configs = makeConfigs([
      { id: 1, coeff: null },
      { id: 2, coeff: 1 },
      { id: 3, coeff: 2 },
    ]);

    const result = calculateAverage(entries, [1, 2, 3], columns, configs);

    // Skip col 1 (null coeff) → (8×1 + 9×2) / 3 = 8.67
    expect(result.average).toBe(8.67);
    expect(result.formula).toBe('(8×1 + 9×2) / 3 = 8.67');
  });

  it('returns null when all columns have null coefficient (totalCoefficients = 0)', () => {
    const entries = { Miệng: '7', Hs15p: '8', Hs1T: '9' };
    const configs = makeConfigs([
      { id: 1, coeff: null },
      { id: 2, coeff: null },
      { id: 3, coeff: null },
    ]);

    const result = calculateAverage(entries, [1, 2, 3], columns, configs);

    expect(result.average).toBeNull();
    expect(result.formula).toBe('');
  });

  it('handles single source column', () => {
    const entries = { Miệng: '8.5' };
    const configs = makeConfigs([{ id: 1, coeff: 2 }]);

    const result = calculateAverage(entries, [1], [columns[0]], configs);

    // (8.5×2) / 2 = 8.5
    expect(result.average).toBe(8.5);
    expect(result.formula).toBe('(8.5×2) / 2 = 8.5');
  });

  it('rounds result to 2 decimal places', () => {
    const entries = { Miệng: '7', Hs15p: '7', Hs1T: '7' };
    const configs = makeConfigs([
      { id: 1, coeff: 1 },
      { id: 2, coeff: 1 },
      { id: 3, coeff: 1 },
    ]);

    const result = calculateAverage(entries, [1, 2, 3], columns, configs);

    // (7×1 + 7×1 + 7×1) / 3 = 7.0
    expect(result.average).toBe(7);
  });
});

// ── classifyScore ─────────────────────────────────────────────────────────────

describe('classifyScore', () => {
  const ranges: ClassificationRange[] = [
    { id: 1, columnId: 4, minScore: 0, maxScore: 4.99, label: 'Yếu', color: '#f44336', sortOrder: 0 },
    { id: 2, columnId: 4, minScore: 5, maxScore: 6.99, label: 'Trung bình', color: '#ff9800', sortOrder: 1 },
    { id: 3, columnId: 4, minScore: 7, maxScore: 7.99, label: 'Khá', color: '#2196f3', sortOrder: 2 },
    { id: 4, columnId: 4, minScore: 8, maxScore: 10, label: 'Giỏi', color: '#4caf50', sortOrder: 3 },
  ];

  it('returns null when average is null', () => {
    expect(classifyScore(null, ranges)).toBeNull();
  });

  it('classifies score in lowest range', () => {
    expect(classifyScore(3.5, ranges)).toEqual({ label: 'Yếu', color: '#f44336' });
  });

  it('classifies score at range boundary (minScore)', () => {
    expect(classifyScore(5, ranges)).toEqual({ label: 'Trung bình', color: '#ff9800' });
  });

  it('classifies score at range boundary (maxScore)', () => {
    expect(classifyScore(10, ranges)).toEqual({ label: 'Giỏi', color: '#4caf50' });
  });

  it('classifies score in highest range', () => {
    expect(classifyScore(8.38, ranges)).toEqual({ label: 'Giỏi', color: '#4caf50' });
  });

  it('returns null when no range matches', () => {
    const gappedRanges: ClassificationRange[] = [
      { id: 1, columnId: 4, minScore: 0, maxScore: 4, label: 'Yếu', color: '#f44336', sortOrder: 0 },
      { id: 2, columnId: 4, minScore: 6, maxScore: 10, label: 'Khá', color: '#2196f3', sortOrder: 1 },
    ];
    // 5 falls in gap between 4 and 6
    expect(classifyScore(5, gappedRanges)).toBeNull();
  });

  it('returns null when ranges array is empty', () => {
    expect(classifyScore(7.5, [])).toBeNull();
  });
});
