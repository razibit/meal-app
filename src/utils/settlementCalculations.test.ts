import { describe, expect, it } from 'vitest';
import { aggregateSettlement, calculateSettlement, roundCurrency } from './settlementCalculations';

describe('settlement calculations', () => {
  it('calculates payable and receivable balances', () => {
    expect(calculateSettlement({ memberId:'1',memberName:'A',meals:30,deposit:500 },20).balance).toBe(100);
    expect(calculateSettlement({ memberId:'2',memberName:'B',meals:10,deposit:500 },20).balance).toBe(-300);
  });
  it('handles zero meals and zero deposits', () => {
    expect(calculateSettlement({memberId:'1',memberName:'A',meals:0,deposit:250},50).balance).toBe(-250);
    expect(calculateSettlement({memberId:'2',memberName:'B',meals:0,deposit:0},50).balance).toBe(0);
  });
  it('retains precision and rounds only for currency display', () => {
    const row=calculateSettlement({memberId:'1',memberName:'A',meals:7,deposit:10},10/3);
    expect(row.balance).toBeCloseTo(13.3333333333,8);
    expect(roundCurrency(row.balance)).toBe(13.33);
    expect(roundCurrency(1.005)).toBe(1.01);
  });
  it('supports high quantities and reconciles aggregates', () => {
    const rows=[calculateSettlement({memberId:'1',memberName:'A',meals:999,deposit:1000},12.3456),calculateSettlement({memberId:'2',memberName:'B',meals:0,deposit:500},12.3456)];
    const totals=aggregateSettlement(rows);
    expect(totals.meals).toBe(999); expect(totals.deposits).toBe(1500); expect(totals.payable).toBe(rows[0].balance); expect(totals.receivable).toBe(500);
  });
});
