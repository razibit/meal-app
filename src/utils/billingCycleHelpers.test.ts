import { describe, expect, it } from 'vitest';
import { getBillingCycle, getBillingCycleDates, shiftBillingCycle } from './billingCycleHelpers';

describe('billing cycle helpers', () => {
  it('uses the complete current calendar month', () => {
    expect(getBillingCycle(new Date(2026, 6, 2))).toEqual({ startDate: '2026-07-01', endDate: '2026-07-31' });
  });

  it('crosses year boundaries', () => {
    const cycle = getBillingCycle(new Date(2026, 11, 20));
    expect(cycle).toEqual({ startDate: '2026-12-01', endDate: '2026-12-31' });
    expect(shiftBillingCycle(cycle, 1)).toEqual({ startDate: '2027-01-01', endDate: '2027-01-31' });
  });

  it('includes every date in a leap-year cycle', () => {
    const dates = getBillingCycleDates({ startDate: '2024-02-01', endDate: '2024-02-29' });
    expect(dates).toHaveLength(29);
    expect(dates).toContain('2024-02-29');
  });
});
