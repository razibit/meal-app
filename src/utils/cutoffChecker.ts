import { getCurrentTimeInTimezone, formatDate } from './dateHelpers';

// Cutoff times in UTC+6 (configurable via environment variables)
const MORNING_CUTOFF_HOUR = parseInt(import.meta.env.VITE_MORNING_CUTOFF_HOUR || '8', 10);
const NIGHT_CUTOFF_HOUR = parseInt(import.meta.env.VITE_NIGHT_CUTOFF_HOUR || '16', 10);

export type MealPeriod = 'morning' | 'night';

/**
 * Check if cutoff time has passed for a given period and date
 * For future dates, cutoff never passes (users can always set future meals)
 */
export function isCutoffPassed(period: MealPeriod, date?: string): boolean {
  const now = getCurrentTimeInTimezone();
  const todayStr = formatDate(now);
  const targetDate = date || todayStr;
  
  // For future dates, cutoff has not passed
  if (targetDate > todayStr) {
    return false;
  }
  
  // For past dates, cutoff has always passed
  if (targetDate < todayStr) {
    return true;
  }
  
  // For today, check the time
  const currentHour = now.getHours();

  if (period === 'morning') {
    return currentHour >= MORNING_CUTOFF_HOUR;
  } else {
    return currentHour >= NIGHT_CUTOFF_HOUR;
  }
}

/**
 * Get time remaining until cutoff in milliseconds
 * Returns 0 if cutoff has passed
 */
export function getTimeUntilCutoff(period: MealPeriod): number {
  const now = getCurrentTimeInTimezone();
  const cutoffHour = period === 'morning' ? MORNING_CUTOFF_HOUR : NIGHT_CUTOFF_HOUR;
  
  const cutoffTime = new Date(now);
  cutoffTime.setHours(cutoffHour, 0, 0, 0);
  
  const timeUntil = cutoffTime.getTime() - now.getTime();
  return Math.max(0, timeUntil);
}

/**
 * Format time until cutoff as human-readable string
 */
export function formatTimeUntilCutoff(period: MealPeriod): string {
  const timeMs = getTimeUntilCutoff(period);
  
  if (timeMs === 0) {
    return 'Cutoff passed';
  }
  
  const hours = Math.floor(timeMs / (1000 * 60 * 60));
  const minutes = Math.floor((timeMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

/**
 * Get the current active period based on time of day
 * Morning is active until 12 PM, then switches to night
 */
export function getActivePeriod(): MealPeriod {
  const now = getCurrentTimeInTimezone();
  const currentHour = now.getHours();
  
  return currentHour < 12 ? 'morning' : 'night';
}

// Re-export CutoffError from errorHandling module for backward compatibility
export { CutoffError } from './errorHandling';
