import type { GlobalReportRow } from '../types';
import { getWeightedMealQuantity } from '../constants/meals';

export interface ReportMember { id: string; name: string }
export interface MealTotals { breakfast: number; lunch: number; dinner: number; total: number }

export function buildGlobalMealReport(rows: GlobalReportRow[]) {
  const members = [...new Map(rows.map((row) => [row.member_id, { id: row.member_id, name: row.member_name }])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));
  const dates = [...new Set(rows.map((row) => row.meal_date))].sort();
  const matrix = new Map<string, Map<string, GlobalReportRow>>();
  rows.forEach((row) => {
    if (!matrix.has(row.meal_date)) matrix.set(row.meal_date, new Map());
    matrix.get(row.meal_date)!.set(row.member_id, {
      ...row,
      breakfast_count: getWeightedMealQuantity('breakfast', row.breakfast_count),
      lunch_count: getWeightedMealQuantity('lunch', row.lunch_count),
      dinner_count: getWeightedMealQuantity('dinner', row.dinner_count),
    });
  });
  const memberTotals = new Map<string, MealTotals>();
  members.forEach((member) => memberTotals.set(member.id, { breakfast: 0, lunch: 0, dinner: 0, total: 0 }));
  const dailyTotals = new Map<string, MealTotals>();
  dates.forEach((date) => {
    const total = { breakfast: 0, lunch: 0, dinner: 0, total: 0 };
    members.forEach((member) => {
      const row = matrix.get(date)?.get(member.id);
      const memberTotal = memberTotals.get(member.id)!;
      const breakfast = row?.breakfast_count || 0;
      const lunch = row?.lunch_count || 0;
      const dinner = row?.dinner_count || 0;
      memberTotal.breakfast += breakfast; memberTotal.lunch += lunch; memberTotal.dinner += dinner; memberTotal.total += breakfast + lunch + dinner;
      total.breakfast += breakfast; total.lunch += lunch; total.dinner += dinner;
    });
    total.total = total.breakfast + total.lunch + total.dinner;
    dailyTotals.set(date, total);
  });
  const globalTotals = [...memberTotals.values()].reduce((sum, item) => ({ breakfast: sum.breakfast + item.breakfast, lunch: sum.lunch + item.lunch, dinner: sum.dinner + item.dinner, total: sum.total + item.total }), { breakfast: 0, lunch: 0, dinner: 0, total: 0 });
  return { members, dates, matrix, memberTotals, dailyTotals, globalTotals };
}
