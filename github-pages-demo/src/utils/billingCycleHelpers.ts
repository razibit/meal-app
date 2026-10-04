import { formatDateForDB } from './mealMonthHelpers';

export interface BillingCycle {
  startDate: string;
  endDate: string;
}

export function getBillingCycle(referenceDate = new Date()): BillingCycle {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { startDate: formatDateForDB(start), endDate: formatDateForDB(end) };
}

export function shiftBillingCycle(cycle: BillingCycle, offset: number): BillingCycle {
  const start = new Date(`${cycle.startDate}T00:00:00`);
  const shifted = new Date(start.getFullYear(), start.getMonth() + offset, 1);
  return getBillingCycle(shifted);
}

export function getBillingCycleDates(cycle: BillingCycle): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${cycle.startDate}T00:00:00`);
  const end = new Date(`${cycle.endDate}T00:00:00`);
  while (cursor <= end) {
    dates.push(formatDateForDB(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
