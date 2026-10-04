import { timeService } from '../services/timeService';

// Timezone handling utilities for UTC+6
const TIMEZONE_OFFSET = 6 * 60; // UTC+6 in minutes

/**
 * Get current date/time in UTC+6 timezone
 * Uses synchronized server time for accuracy
 */
export function getCurrentTimeInTimezone(): Date {
  const now = timeService.now(); // Use synchronized time instead of device time
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + TIMEZONE_OFFSET * 60000);
}

/**
 * Format date as YYYY-MM-DD in UTC+6
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in YYYY-MM-DD format (UTC+6)
 */
export function getTodayDate(): string {
  return formatDate(getCurrentTimeInTimezone());
}

/**
 * Format time as HH:MM
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format date for display (e.g., "Friday, October 24, 2025")
 */
export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = getCurrentTimeInTimezone();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(date);
}
