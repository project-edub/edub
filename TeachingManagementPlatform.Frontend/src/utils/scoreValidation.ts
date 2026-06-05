/**
 * Score validation and rounding utilities for the ScoreGrid.
 */

export interface ScoreValidationResult {
  valid: boolean;
  value: number | null;
  /** For text values, stores the raw text */
  textValue?: string;
  error?: string;
}

/**
 * Validates a score input string.
 *
 * - Empty string → valid with null value (blank cell is allowed)
 * - Number in [0, 10] → valid with rounded value (auto-round to 2dp)
 * - Number outside [0, 10] → invalid with error message
 * - Non-numeric string (text) → valid as text (stored as-is, excluded from average calculation)
 *
 * @param input - Raw string from the score input cell
 * @returns Validation result with parsed value or error
 */
export function validateScore(input: string): ScoreValidationResult {
  // Ô trống là hợp lệ
  if (input.trim() === '') {
    return { valid: true, value: null };
  }

  const num = parseFloat(input);

  // Không phải số → cho phép nhập chữ (text), không tính trung bình
  if (isNaN(num)) {
    return { valid: true, value: null, textValue: input };
  }

  // Ngoài khoảng 0-10
  if (num < 0 || num > 10) {
    return { valid: false, value: null, error: 'Điểm phải từ 0 đến 10' };
  }

  // Tự động làm tròn đến 2 chữ số thập phân
  const rounded = roundScore(num, 2);
  return { valid: true, value: rounded };
}

/**
 * Rounds a numeric score to the specified number of decimal places
 * using standard mathematical rounding (≥0.005 rounds up at 2dp).
 *
 * @param value - The numeric score to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns The rounded value
 */
export function roundScore(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
