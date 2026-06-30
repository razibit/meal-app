import { describe, expect, it } from 'vitest';
import { queryKeys } from './keys';

describe('query keys', () => {
  it('keeps date-scoped meal requests isolated', () => {
    expect(queryKeys.meals('2026-06-30')).not.toEqual(queryKeys.meals('2026-07-01'));
  });

  it('uses stable prefixes for domain invalidation', () => {
    expect(queryKeys.depositReport()[0]).toBe('deposit-report');
    expect(queryKeys.globalReport()[0]).toBe('global-report');
    expect(queryKeys.settlement()[0]).toBe('settlement');
  });
});
