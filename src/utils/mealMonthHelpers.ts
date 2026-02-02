import { Member } from '../types';

/**
 * Default meal management month configuration
 * Runs from 6th of one month to 5th of next month
 */
export const DEFAULT_START_DAY = 6;
export const DEFAULT_END_DAY = 5;

/**
 * Calculate the current meal management month date range for a member
 * Returns { startDate, endDate } as ISO date strings (YYYY-MM-DD)
 * 
 * Logic:
 * - If member has custom dates set, use those
 * - Otherwise, use default (6th to 5th) logic based on current date
 */
export function getMealMonthDateRange(member: Member | null, referenceDate?: Date): { startDate: string; endDate: string } {
  // If member has custom dates configured, use them
  if (member?.meal_month_start_date && member?.meal_month_end_date) {
    return {
      startDate: member.meal_month_start_date,
      endDate: member.meal_month_end_date,
    };
  }

  // Otherwise, calculate default (6th to 5th) based on reference date
  const now = referenceDate || new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();

  let startDate: Date;
  let endDate: Date;

  // If we're before the 6th, the meal month is from previous month's 6th to current month's 5th
  if (currentDay < DEFAULT_START_DAY) {
    startDate = new Date(currentYear, currentMonth - 1, DEFAULT_START_DAY);
    endDate = new Date(currentYear, currentMonth, DEFAULT_END_DAY);
  } else {
    // If we're on or after the 6th, meal month is from current month's 6th to next month's 5th
    startDate = new Date(currentYear, currentMonth, DEFAULT_START_DAY);
    endDate = new Date(currentYear, currentMonth + 1, DEFAULT_END_DAY);
  }

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
 * Example: "Feb 6, 2026 - Mar 5, 2026"
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
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let startDate: Date;
  let endDate: Date;

  if (currentDay < DEFAULT_START_DAY) {
    startDate = new Date(currentYear, currentMonth - 1, DEFAULT_START_DAY);
    endDate = new Date(currentYear, currentMonth, DEFAULT_END_DAY);
  } else {
    startDate = new Date(currentYear, currentMonth, DEFAULT_START_DAY);
    endDate = new Date(currentYear, currentMonth + 1, DEFAULT_END_DAY);
  }

  return {
    startDate: formatDateForDB(startDate),
    endDate: formatDateForDB(endDate),
  };
}
