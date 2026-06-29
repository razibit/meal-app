export const MEAL_PERIODS = ['breakfast', 'lunch', 'dinner'] as const;

export type MealPeriod = (typeof MEAL_PERIODS)[number];

export const MEAL_PERIOD_LABELS: Record<MealPeriod, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

export const MEAL_PERIOD_SHORT_LABELS: Record<MealPeriod, string> = {
  breakfast: 'B',
  lunch: 'L',
  dinner: 'D',
};

export type PeriodCounts<T = number> = Record<MealPeriod, T>;
