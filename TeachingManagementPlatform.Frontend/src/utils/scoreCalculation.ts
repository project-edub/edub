/**
 * Score calculation utilities: weighted average and classification.
 */

import { roundScore } from './scoreValidation';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ScoreColumnConfig {
  columnId: number;
  coefficient: number | null;
  isAverageColumn: boolean;
  sourceColumnIds: number[];
}

export interface ClassificationRange {
  id: number;
  columnId: number;
  minScore: number;
  maxScore: number;
  label: string;
  color: string;
  sortOrder: number;
}

export interface AverageResult {
  average: number | null;
  formula: string;
}

export interface ClassificationResult {
  label: string;
  color: string;
}

// ── calculateAverage ──────────────────────────────────────────────────────────

/**
 * Calculates the weighted average score from source columns.
 *
 * - If ANY source column value is empty/null → returns { average: null, formula: "" }
 * - If a source column value is non-numeric (text) → skip that column
 * - If a source column has coefficient === null → skip (warning state)
 * - Otherwise: average = sum(score_i × coeff_i) / sum(coeff_i), rounded to 2dp
 * - formula shows human-readable breakdown
 *
 * @param entries - Record mapping column name → raw string value
 * @param sourceColumnIds - IDs of columns that participate in the average
 * @param columns - Array of column definitions with id and name
 * @param columnConfigs - Map from columnId to its ScoreColumnConfig
 * @returns The computed average and a human-readable formula string
 */
export function calculateAverage(
  entries: Record<string, string>,
  sourceColumnIds: number[],
  columns: Array<{ id: number; name: string }>,
  columnConfigs: Map<number, ScoreColumnConfig>,
): AverageResult {
  let totalWeightedScore = 0;
  let totalCoefficients = 0;
  const formulaParts: string[] = [];

  for (const colId of sourceColumnIds) {
    const column = columns.find((c) => c.id === colId);
    if (!column) continue;

    const rawValue = entries[column.name];

    // Ô trống → average = null (chưa đủ dữ liệu)
    if (rawValue === undefined || rawValue === null || rawValue.trim() === '') {
      return { average: null, formula: '' };
    }

    const numericValue = parseFloat(rawValue);

    // Giá trị không phải số → bỏ qua (cột chữ)
    if (isNaN(numericValue)) continue;

    const config = columnConfigs.get(colId);

    // Cột chưa có hệ số → bỏ qua
    if (!config || config.coefficient === null) {
      continue;
    }

    const coeff = config.coefficient;
    totalWeightedScore += numericValue * coeff;
    totalCoefficients += coeff;
    formulaParts.push(`${numericValue}×${coeff}`);
  }

  if (totalCoefficients === 0) {
    return { average: null, formula: '' };
  }

  const average = roundScore(totalWeightedScore / totalCoefficients, 2);
  const formula = `(${formulaParts.join(' + ')}) / ${totalCoefficients} = ${average}`;

  return { average, formula };
}

// ── classifyScore ─────────────────────────────────────────────────────────────

/**
 * Classifies a score average into a labelled range.
 *
 * - If average is null → returns null
 * - If average falls within a range [minScore, maxScore] → returns { label, color }
 * - If average doesn't match any range → returns null
 *
 * @param average - The computed average score, or null if incomplete
 * @param ranges - Classification ranges (sorted by sortOrder, non-overlapping)
 * @returns The matching classification or null
 */
export function classifyScore(
  average: number | null,
  ranges: ClassificationRange[],
): ClassificationResult | null {
  if (average === null) {
    return null;
  }

  for (const range of ranges) {
    if (average >= range.minScore && average <= range.maxScore) {
      return { label: range.label, color: range.color };
    }
  }

  return null;
}
