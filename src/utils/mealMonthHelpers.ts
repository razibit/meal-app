import { Member } from '../types';

/**
 * Default meal management month configuration
 * Runs from the first through the last day of the calendar month.
 */
export const DEFAULT_START_DAY = 1;

/**
 * Calculate the current meal management month date range for a member
 * Returns { startDate, endDate } as ISO date strings (YYYY-MM-DD)
 * 
 * Logic:
 * - If member has custom dates set, use those
 * - Otherwise, use the current calendar month
 */
export function getMealMonthDateRange(member: Member | null, referenceDate?: Date): { startDate: string; endDate: string } {
  // If member has custom dates configured, use them
  if (member?.meal_month_start_date && member?.meal_month_end_date) {
    return {
      startDate: member.meal_month_start_date,
      endDate: member.meal_month_end_date,
    };
  }

  // Otherwise, calculate the current calendar month.
  const now = referenceDate || new Date();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();
  const startDate = new Date(currentYear, currentMonth, DEFAULT_START_DAY);
  const endDate = new Date(currentYear, currentMonth + 1, 0);

  return {
    startDate: formatDateForDB(startDate),
    endDate: formatDateForDB(endDate),
  };
}

/**
 * Format Date object as YYYY-MM-DD for database/API calls
 */
export function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date range for display
 * Example: "Feb 1, 2026 - Feb 28, 2026"
 */
export function formatDateRangeForDisplay(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  return `${startStr} - ${endStr}`;
}

/**
 * Check if custom dates are set for a member
 */
export function hasCustomMealMonth(member: Member | null): boolean {
  return !!(member?.meal_month_start_date && member?.meal_month_end_date);
}

/**
 * Validate that end date is after start date
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  return end > start;
}

/**
 * Calculate suggested default dates for new configuration
 * Returns dates in YYYY-MM-DD format
 */
export function getDefaultMealMonthDates(): { startDate: string; endDate: string } {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const startDate = new Date(currentYear, currentMonth, DEFAULT_START_DAY);
  const endDate = new Date(currentYear, currentMonth + 1, 0);

  return {
    startDate: formatDateForDB(startDate),
    endDate: formatDateForDB(endDate),
  };
}
