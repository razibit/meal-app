import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Member } from '../../types';
import { supabase } from '../../services/supabase';
import { useDepositStore } from '../../stores/depositStore';
import { useMealRateStore } from '../../stores/mealRateStore';
import { getMealMonthDateRange, formatDateRangeForDisplay } from '../../utils/mealMonthHelpers';

interface Props { user: Member | null; }
interface Row { id: string; name: string; meals: number; deposit: number; balance: number; }
const formatCurrency = (amount: number) => `৳${amount.toFixed(2)}`;

function SettlementReport({ user }: Props) {
  const range = useMemo(() => getMealMonthDateRange(user), [user]);
  const { currentRate, fetchLatestRate } = useMealRateStore();
  const { getMemberTotalDeposit } = useDepositStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    await fetchLatestRate(range.startDate, range.endDate);
    const { data, error } = await supabase.rpc('get_global_monthly_report_with_dates', { p_start_date: range.startDate, p_end_date: range.endDate });
    if (error) { console.error(error); setLoading(false); return; }
    const members = new Map<string, { name: string; meals: number }>();
    for (const item of data || []) {
      const current = members.get(item.member_id) || { name: item.member_name, meals: 0 };
      current.meals += item.breakfast_count + item.lunch_count + item.dinner_count;
      members.set(item.member_id, current);
    }
    const rate = useMealRateStore.getState().currentRate?.meal_rate || 0;
    setRows(await Promise.all([...members].map(async ([id, item]) => {
      const deposit = await getMemberTotalDeposit(id, range.startDate, range.endDate);
      return { id, name: item.name, meals: item.meals, deposit, balance: item.meals * rate - deposit };
    })));
    setLoading(false);
  }, [fetchLatestRate, getMemberTotalDeposit, range]);
  useEffect(() => { void load(); }, [load]);
  return <section className="card overflow-hidden"><div className="p-4 bg-bg-secondary border-b border-border"><h3 className="text-lg font-semibold text-text-primary">Settlement</h3><p className="text-sm text-text-secondary">{formatDateRangeForDisplay(range.startDate, range.endDate)} · Meal rate {formatCurrency(currentRate?.meal_rate || 0)}</p></div>{loading ? <div className="p-8 text-center text-text-secondary">Loading...</div> : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-bg-tertiary"><th className="p-3 text-left">Member</th><th className="p-3 text-center">Meals</th><th className="p-3 text-right">Deposit</th><th className="p-3 text-right">Balance</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t border-border"><td className="p-3">{row.name}</td><td className="p-3 text-center">{row.meals}</td><td className="p-3 text-right">{formatCurrency(row.deposit)}</td><td className="p-3 text-right font-semibold">{row.balance >= 0 ? `Give ${formatCurrency(row.balance)}` : `Receive ${formatCurrency(-row.balance)}`}</td></tr>)}</tbody></table></div>}</section>;
}
export default SettlementReport;
