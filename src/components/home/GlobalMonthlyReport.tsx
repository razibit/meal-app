import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GlobalReportRow, Member } from '../../types';
import { supabase } from '../../services/supabase';
import { getMealMonthDateRange, formatDateRangeForDisplay } from '../../utils/mealMonthHelpers';

function GlobalMonthlyReport({ user }: { user: Member | null }) {
  const range = useMemo(() => getMealMonthDateRange(user), [user]);
  const [rows, setRows] = useState<GlobalReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_global_monthly_report_with_dates', { p_start_date: range.startDate, p_end_date: range.endDate });
    if (error) console.error(error); else setRows(data || []);
    setLoading(false);
  }, [range]);
  useEffect(() => { void load(); }, [load]);
  const totals = useMemo(() => {
    const result = new Map<string, { name: string; breakfast: number; lunch: number; dinner: number }>();
    rows.forEach(row => { const item = result.get(row.member_id) || { name: row.member_name, breakfast: 0, lunch: 0, dinner: 0 }; item.breakfast += row.breakfast_count; item.lunch += row.lunch_count; item.dinner += row.dinner_count; result.set(row.member_id, item); });
    return [...result.entries()];
  }, [rows]);
  const exportCsv = () => {
    const csv = ['Member,Breakfast,Lunch,Dinner,Total', ...totals.map(([, item]) => `${JSON.stringify(item.name)},${item.breakfast},${item.lunch},${item.dinner},${item.breakfast + item.lunch + item.dinner}`)].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `global-meal-report-${range.startDate}-${range.endDate}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };
  return <section className="card overflow-hidden"><div className="p-4 bg-bg-secondary border-b border-border flex items-center justify-between"><div><h3 className="text-lg font-semibold text-text-primary">Global Meal Report</h3><p className="text-sm text-text-secondary">{formatDateRangeForDisplay(range.startDate, range.endDate)}</p></div><button className="btn-secondary px-3 py-2" onClick={exportCsv} disabled={!totals.length}>CSV</button></div>{loading ? <div className="p-8 text-center">Loading...</div> : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-bg-tertiary"><th className="p-3 text-left">Member</th><th className="p-3 text-center">Breakfast</th><th className="p-3 text-center">Lunch</th><th className="p-3 text-center">Dinner</th><th className="p-3 text-center">Total</th></tr></thead><tbody>{totals.map(([id, item]) => <tr key={id} className="border-t border-border"><td className="p-3">{item.name}</td><td className="p-3 text-center">{item.breakfast}</td><td className="p-3 text-center">{item.lunch}</td><td className="p-3 text-center">{item.dinner}</td><td className="p-3 text-center font-semibold">{item.breakfast + item.lunch + item.dinner}</td></tr>)}</tbody></table></div>}</section>;
}
export default GlobalMonthlyReport;
