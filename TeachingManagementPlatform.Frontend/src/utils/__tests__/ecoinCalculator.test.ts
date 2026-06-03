import { describe, it, expect } from 'vitest';
import { calculateEcoin, calculateRegenerateEcoin, ECOIN_RATES } from '../ecoinCalculator';
import type { GameConfig } from '../../types/crossword';

// ── Helper ────────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    wordCount: 10,
    difficulty: 'medium',
    language: 'vi',
    clueStyle: 'definition',
    excludeWords: [],
    ...overrides,
  };
}

// ── calculateEcoin ────────────────────────────────────────────────────────────

describe('calculateEcoin', () => {
  describe('word count ranges (base cost)', () => {
    it('returns 5 for wordCount 5–10', () => {
      expect(calculateEcoin(makeConfig({ wordCount: 5 }))).toBe(5);
      expect(calculateEcoin(makeConfig({ wordCount: 7 }))).toBe(5);
      expect(calculateEcoin(makeConfig({ wordCount: 10 }))).toBe(5);
    });

    it('returns 8 for wordCount 11–15', () => {
      expect(calculateEcoin(makeConfig({ wordCount: 11 }))).toBe(8);
      expect(calculateEcoin(makeConfig({ wordCount: 13 }))).toBe(8);
      expect(calculateEcoin(makeConfig({ wordCount: 15 }))).toBe(8);
    });

    it('returns 10 for wordCount 16–20', () => {
      expect(calculateEcoin(makeConfig({ wordCount: 16 }))).toBe(10);
      expect(calculateEcoin(makeConfig({ wordCount: 18 }))).toBe(10);
      expect(calculateEcoin(makeConfig({ wordCount: 20 }))).toBe(10);
    });

    it('returns 12 for wordCount 21–25', () => {
      expect(calculateEcoin(makeConfig({ wordCount: 21 }))).toBe(12);
      expect(calculateEcoin(makeConfig({ wordCount: 23 }))).toBe(12);
      expect(calculateEcoin(makeConfig({ wordCount: 25 }))).toBe(12);
    });

    it('returns 15 for wordCount 26–30', () => {
      expect(calculateEcoin(makeConfig({ wordCount: 26 }))).toBe(15);
      expect(calculateEcoin(makeConfig({ wordCount: 28 }))).toBe(15);
      expect(calculateEcoin(makeConfig({ wordCount: 30 }))).toBe(15);
    });
  });

  describe('clue style modifiers', () => {
    it('adds 0 for definition clue style', () => {
      expect(calculateEcoin(makeConfig({ clueStyle: 'definition' }))).toBe(5);
    });

    it('adds 3 for fill-in-blank clue style', () => {
      expect(calculateEcoin(makeConfig({ clueStyle: 'fill-in-blank' }))).toBe(8);
    });

    it('adds 5 for multiple-choice clue style', () => {
      expect(calculateEcoin(makeConfig({ clueStyle: 'multiple-choice' }))).toBe(10);
    });

    it('adds 0 for unknown clue style (fallback)', () => {
      expect(calculateEcoin(makeConfig({ clueStyle: 'unknown-style' }))).toBe(5);
    });
  });

  describe('language modifiers', () => {
    it('adds 0 for Vietnamese (vi)', () => {
      expect(calculateEcoin(makeConfig({ language: 'vi' }))).toBe(5);
    });

    it('adds 2 for English (en)', () => {
      expect(calculateEcoin(makeConfig({ language: 'en' }))).toBe(7);
    });

    it('adds 0 for unknown language (fallback)', () => {
      expect(calculateEcoin(makeConfig({ language: 'fr' }))).toBe(5);
    });
  });

  describe('combined modifiers', () => {
    it('calculates correctly with all modifiers: fill-in-blank + en + 16 words', () => {
      // base(16-20)=10 + fill-in-blank=3 + en=2 = 15
      const config = makeConfig({ wordCount: 16, clueStyle: 'fill-in-blank', language: 'en' });
      expect(calculateEcoin(config)).toBe(15);
    });

    it('calculates correctly with multiple-choice + en + 26 words', () => {
      // base(26-30)=15 + multiple-choice=5 + en=2 = 22
      const config = makeConfig({ wordCount: 26, clueStyle: 'multiple-choice', language: 'en' });
      expect(calculateEcoin(config)).toBe(22);
    });

    it('calculates minimum cost: definition + vi + 5 words', () => {
      // base(5-10)=5 + definition=0 + vi=0 = 5
      const config = makeConfig({ wordCount: 5, clueStyle: 'definition', language: 'vi' });
      expect(calculateEcoin(config)).toBe(5);
    });

    it('calculates maximum cost: multiple-choice + en + 30 words', () => {
      // base(26-30)=15 + multiple-choice=5 + en=2 = 22
      const config = makeConfig({ wordCount: 30, clueStyle: 'multiple-choice', language: 'en' });
      expect(calculateEcoin(config)).toBe(22);
    });
  });

  describe('edge cases / boundary values', () => {
    it('clamps wordCount below minimum range to first range cost', () => {
      // wordCount < 5 → fallback to first range cost (5)
      expect(calculateEcoin(makeConfig({ wordCount: 1 }))).toBe(5);
      expect(calculateEcoin(makeConfig({ wordCount: 4 }))).toBe(5);
    });

    it('clamps wordCount above maximum range to last range cost', () => {
      // wordCount > 30 → fallback to last range cost (15)
      expect(calculateEcoin(makeConfig({ wordCount: 31 }))).toBe(15);
      expect(calculateEcoin(makeConfig({ wordCount: 100 }))).toBe(15);
    });
  });
});

// ── calculateRegenerateEcoin ──────────────────────────────────────────────────

describe('calculateRegenerateEcoin', () => {
  it('returns 50% of generate cost rounded up (even cost)', () => {
    // base=10 + 0 + 0 = 10 → 50% = 5
    const config = makeConfig({ wordCount: 16, clueStyle: 'definition', language: 'vi' });
    expect(calculateRegenerateEcoin(config)).toBe(5);
  });

  it('rounds up when 50% produces a fractional result (odd cost)', () => {
    // base=5 + 0 + 0 = 5 → 50% = 2.5 → ceil = 3
    const config = makeConfig({ wordCount: 5, clueStyle: 'definition', language: 'vi' });
    expect(calculateRegenerateEcoin(config)).toBe(3);
  });

  it('rounds up correctly for larger odd cost', () => {
    // base=15 + fill-in-blank=3 + en=2 = 20 → 50% = 10
    const config = makeConfig({ wordCount: 26, clueStyle: 'fill-in-blank', language: 'en' });
    expect(calculateRegenerateEcoin(config)).toBe(10);
  });

  it('rounds up correctly for cost of 7', () => {
    // base=5 + 0 + en=2 = 7 → 50% = 3.5 → ceil = 4
    const config = makeConfig({ wordCount: 10, clueStyle: 'definition', language: 'en' });
    expect(calculateRegenerateEcoin(config)).toBe(4);
  });

  it('rounds up correctly for cost of 8', () => {
    // base=8 + 0 + 0 = 8 → 50% = 4
    const config = makeConfig({ wordCount: 11, clueStyle: 'definition', language: 'vi' });
    expect(calculateRegenerateEcoin(config)).toBe(4);
  });

  it('regenerate cost is always ≤ generate cost', () => {
    const configs = [
      makeConfig({ wordCount: 5 }),
      makeConfig({ wordCount: 15, clueStyle: 'fill-in-blank', language: 'en' }),
      makeConfig({ wordCount: 30, clueStyle: 'multiple-choice', language: 'en' }),
    ];
    for (const config of configs) {
      expect(calculateRegenerateEcoin(config)).toBeLessThanOrEqual(calculateEcoin(config));
    }
  });
});

// ── ECOIN_RATES export ────────────────────────────────────────────────────────

describe('ECOIN_RATES', () => {
  it('exports wordCount rates table', () => {
    expect(ECOIN_RATES.wordCount).toHaveLength(5);
    expect(ECOIN_RATES.wordCount[0]).toEqual([5, 10, 5]);
    expect(ECOIN_RATES.wordCount[4]).toEqual([26, 30, 15]);
  });

  it('exports clueStyle rates', () => {
    expect(ECOIN_RATES.clueStyle).toEqual({
      definition: 0,
      'fill-in-blank': 3,
      'multiple-choice': 5,
    });
  });

  it('exports language rates', () => {
    expect(ECOIN_RATES.language).toEqual({
      vi: 0,
      en: 2,
    });
  });
});
