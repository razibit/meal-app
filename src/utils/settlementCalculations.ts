export interface SettlementInput { memberId: string; memberName: string; meals: number; deposit: number; }
export interface SettlementResult extends SettlementInput { mealCost: number; balance: number; }

export const calculateSettlement = (input: SettlementInput, mealRate: number): SettlementResult => ({
  ...input,
  mealCost: input.meals * mealRate,
  balance: input.meals * mealRate - input.deposit,
});

export const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const aggregateSettlement = (rows: SettlementResult[]) => ({
  payable: rows.filter((row) => row.balance > 0).reduce((sum, row) => sum + row.balance, 0),
  receivable: rows.filter((row) => row.balance < 0).reduce((sum, row) => sum + Math.abs(row.balance), 0),
  deposits: rows.reduce((sum, row) => sum + row.deposit, 0),
  meals: rows.reduce((sum, row) => sum + row.meals, 0),
});
