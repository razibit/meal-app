import { timeService } from '../services/timeService';
import type { MealPeriod } from '../constants/meals';

const CUTOFF_HOURS: Record<MealPeriod, number> = {
  breakfast: 8,
  lunch: 12,
  dinner: 18,
};

const ACTIVE_PERIODS: Array<{ period: MealPeriod; untilHour: number }> = [
  { period: 'breakfast', untilHour: 10 },
  { period: 'lunch', untilHour: 16 },
  { period: 'dinner', untilHour: 24 },
];

export type { MealPeriod };

export function isCutoffPassed(period: MealPeriod, date?: string): boolean {
  const now = timeService.now();

  if (date) {
    const targetDate = new Date(date + 'T00:00:00');
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (targetDate < today) return true;
    if (targetDate > today) return false;
  }

  return now.getHours() >= CUTOFF_HOURS[period];
}

export function formatTimeUntilCutoff(period: MealPeriod): string {
  const now = timeService.now();
  const cutoffHour = CUTOFF_HOURS[period];
  const cutoffTime = new Date(now);
  cutoffTime.setHours(cutoffHour, 0, 0, 0);

  if (now >= cutoffTime) return 'Cutoff passed';

  const diffMs = cutoffTime.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) return `${diffHours}h ${diffMinutes}m left`;
  return `${diffMinutes}m left`;
}

export function getActivePeriod(): MealPeriod {
  const hour = timeService.now().getHours();
  return ACTIVE_PERIODS.find((item) => hour < item.untilHour)?.period || 'dinner';
}
