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

export const MEAL_PERIOD_WEIGHTS: Record<MealPeriod, number> = {
  breakfast: 0.5,
  lunch: 1,
  dinner: 1,
};

export const getWeightedMealQuantity = (period: MealPeriod, quantity: number): number =>
  quantity * MEAL_PERIOD_WEIGHTS[period];

export const getWeightedMealTotal = (counts: PeriodCounts<number>): number =>
  MEAL_PERIODS.reduce(
    (total, period) => total + getWeightedMealQuantity(period, counts[period]),
    0,
  );
