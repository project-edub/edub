/**
 * Vietnamese date and currency formatting utilities.
 */

/**
 * Formats an ISO date string to Vietnamese dd/MM/yyyy format.
 * @param dateStr - ISO date string (e.g., "2024-06-15T10:00:00Z")
 * @returns Formatted date string (e.g., "15/06/2024")
 */
export function formatDate(dateStr: string): string {
  const trimmed = dateStr.trim();
  const parts = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (parts) {
    return `${parts[1]}/${parts[2]}/${parts[3]}`;
  }

  const d = new Date(trimmed);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a number as Vietnamese currency with dot separators and đ suffix.
 * @param amount - Non-negative number to format
 * @returns Formatted currency string (e.g., "1.500.000đ")
 */
export function formatCurrency(amount: number): string {
  const formatted = Math.floor(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}đ`;
}
