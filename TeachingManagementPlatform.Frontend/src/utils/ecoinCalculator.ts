/**
 * ECoin calculation utilities for the Crossword Generator feature.
 * Pricing table based on Requirements section 4.1.
 */

import type { GameConfig } from '../types/crossword';

// ── Rate tables ───────────────────────────────────────────────────────────────

/**
 * Base ECoin cost by word count range.
 * Each entry: [minWords, maxWords, baseCost]
 */
const WORD_COUNT_RATES: ReadonlyArray<readonly [number, number, number]> = [
  [5, 10, 5],
  [11, 15, 8],
  [16, 20, 10],
  [21, 25, 12],
  [26, 30, 15],
];

/**
 * Additional ECoin cost by clue style.
 */
const CLUE_STYLE_RATES: Readonly<Record<string, number>> = {
  definition: 0,
  'fill-in-blank': 3,
  'multiple-choice': 5,
};

/**
 * Additional ECoin cost by language.
 */
const LANGUAGE_RATES: Readonly<Record<string, number>> = {
  vi: 0,
  en: 2,
};

/**
 * Exported rate constants for use in UI display components.
 */
export const ECOIN_RATES = {
  wordCount: WORD_COUNT_RATES,
  clueStyle: CLUE_STYLE_RATES,
  language: LANGUAGE_RATES,
} as const;

// ── Calculation functions ─────────────────────────────────────────────────────

/**
 * Calculates the ECoin cost for generating a crossword based on the given config.
 * Formula: baseCost(wordCount) + clueStyleModifier + languageModifier
 *
 * @param config - Game configuration
 * @returns Total ECoin cost (always a positive integer)
 */
export function calculateEcoin(config: GameConfig): number {
  const baseCost = getBaseCost(config.wordCount);
  const clueStyleModifier = CLUE_STYLE_RATES[config.clueStyle] ?? 0;
  const languageModifier = LANGUAGE_RATES[config.language] ?? 0;

  return baseCost + clueStyleModifier + languageModifier;
}

/**
 * Calculates the ECoin cost for regenerating a crossword (50% of generate cost,
 * rounded up).
 *
 * @param config - Game configuration
 * @returns Regeneration ECoin cost (Math.ceil of 50% of full cost)
 */
export function calculateRegenerateEcoin(config: GameConfig): number {
  return Math.ceil(calculateEcoin(config) * 0.5);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the base ECoin cost for the given word count.
 * Falls back to the nearest boundary if wordCount is out of the defined ranges.
 */
function getBaseCost(wordCount: number): number {
  for (const [min, max, cost] of WORD_COUNT_RATES) {
    if (wordCount >= min && wordCount <= max) {
      return cost;
    }
  }

  // Clamp to boundaries for out-of-range values
  if (wordCount < WORD_COUNT_RATES[0][0]) {
    return WORD_COUNT_RATES[0][2];
  }
  return WORD_COUNT_RATES[WORD_COUNT_RATES.length - 1][2];
}
