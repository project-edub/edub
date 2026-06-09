/**
 * Score search utilities for filtering StudentEntry lists.
 */

import type { StudentEntry } from '../types/studentList';

/**
 * Filters entries by a search query using case-insensitive substring matching.
 *
 * - If `targetColumnNames` is null → search across ALL columns in entry.data
 * - If `targetColumnNames` is provided → search only in those specific columns
 * - Original order is preserved
 * - Returns an empty array when no entries match
 *
 * @param entries - Array of student entries to search through
 * @param query - Non-empty trimmed search string
 * @param targetColumnNames - Columns to restrict search to, or null for all columns
 * @returns Subset of entries where at least one value matches the query
 */
export function searchEntries(
  entries: StudentEntry[],
  query: string,
  targetColumnNames: string[] | null,
): StudentEntry[] {
  const lowerQuery = query.toLowerCase();

  return entries.filter((entry) => {
    const keys =
      targetColumnNames !== null
        ? targetColumnNames
        : Object.keys(entry.data);

    return keys.some((key) => {
      const value = entry.data[key];
      if (value === undefined || value === null) return false;
      return value.toLowerCase().includes(lowerQuery);
    });
  });
}
