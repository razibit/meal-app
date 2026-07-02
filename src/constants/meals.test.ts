import { describe, expect, it } from 'vitest';
import { getWeightedMealQuantity, getWeightedMealTotal } from './meals';

describe('meal weights', () => {
  it.each([
    [{ breakfast: 1, lunch: 1, dinner: 1 }, 2.5],
    [{ breakfast: 1, lunch: 0, dinner: 0 }, 0.5],
    [{ breakfast: 0, lunch: 1, dinner: 1 }, 2],
    [{ breakfast: 1, lunch: 0, dinner: 1 }, 1.5],
    [{ breakfast: 1, lunch: 1, dinner: 0 }, 1.5],
    [{ breakfast: 3, lunch: 2, dinner: 2 }, 5.5],
  ])('weights %# correctly', (counts, expected) => {
    expect(getWeightedMealTotal(counts)).toBe(expected);
  });

  it('weights individual breakfast quantities', () => {
    expect(getWeightedMealQuantity('breakfast', 3)).toBe(1.5);
  });
});
