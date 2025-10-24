import { getCurrentTimeInTimezone } from './dateHelpers';

// Cutoff times in UTC+6
const MORNING_CUTOFF_HOUR = 7; // 7:00 AM
const NIGHT_CUTOFF_HOUR = 18; // 6:00 PM

export type MealPeriod = 'morning' | 'night';

/**
 * Check if cutoff time has passed for a given period
 */
export function isCutoffPassed(period: MealPeriod): boolean {
  const now = getCurrentTimeInTimezone();
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

/**
 * Custom error for cutoff violations
 */
export class CutoffError extends Error {
  constructor(period: MealPeriod) {
    const cutoffTime = period === 'morning' ? '7:00 AM' : '6:00 PM';
    super(`Cannot modify ${period} meal after ${cutoffTime}`);
    this.name = 'CutoffError';
  }
}
