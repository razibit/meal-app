import { describe, expect, it } from 'vitest';
import { getBillingCycleDates } from '../../utils/billingCycleHelpers';

describe('billing-month date navigation', () => {
  it('includes every date in the configured range', () => {
    const dates = getBillingCycleDates({ startDate: '2026-07-01', endDate: '2026-07-31' });
    expect(dates).toHaveLength(31);
    expect(dates[0]).toBe('2026-07-01');
    expect(dates[1]).toBe('2026-07-02');
    expect(dates[dates.length - 1]).toBe('2026-07-31');
  });

  it('supports custom ranges across calendar months', () => {
    expect(getBillingCycleDates({ startDate: '2026-06-25', endDate: '2026-07-05' })).toHaveLength(11);
  });
});
