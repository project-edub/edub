/**
 * Vietnamese text normalization utilities for the crossword feature.
 *
 * Used in two contexts:
 *  - Editor: normalize words returned by AI before storing/displaying
 *  - Player: compare student answers against stored answers (diacritic- and
 *    case-insensitive)
 */

/**
 * Normalizes a Vietnamese (or plain Latin) string to uppercase ASCII letters
 * and underscores only.
 *
 * Steps:
 *  1. Replace 'đ' → 'd' and 'Đ' → 'D' explicitly, because these characters
 *     do NOT decompose via NFD and must be handled before decomposition.
 *  2. NFD-decompose the string so that combining diacritical marks become
 *     separate code points.
 *  3. Strip all combining diacritical marks (Unicode range U+0300–U+036F).
 *  4. Convert to uppercase.
 *  5. Remove every character that is not A–Z or underscore ('_').
 *
 * @param text - Raw input string (may contain Vietnamese diacritics).
 * @returns Normalized uppercase ASCII string with only A-Z and '_'.
 *
 * @example
 * normalize('Tiếng Việt')  // → 'TIENG_VIET'  (spaces removed)
 * normalize('đường')       // → 'DUONG'
 * normalize('HELLO_WORLD') // → 'HELLO_WORLD'
 */
export function normalize(text: string): string {
  return text
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z_]/g, '');
}

/**
 * Checks whether a student's input matches the expected answer, ignoring
 * diacritics and letter case.
 *
 * Both sides are normalized via {@link normalize} before comparison, so
 * "Tiếng Việt", "tieng viet", and "TIENGVIET" are all treated as equivalent
 * (assuming spaces are stripped by normalization).
 *
 * @param input  - The student's raw answer string.
 * @param answer - The stored correct answer (may be normalized already or not).
 * @returns `true` if both strings normalize to the same value.
 *
 * @example
 * checkAnswer('đường', 'DUONG')   // → true
 * checkAnswer('hello', 'HELLO')   // → true
 * checkAnswer('sai', 'DUNG')      // → false
 */
export function checkAnswer(input: string, answer: string): boolean {
  return normalize(input) === normalize(answer);
}
