import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Member } from '../../types';
import { supabase } from '../../services/supabase';
import { useDepositStore } from '../../stores/depositStore';
import { useMealRateStore } from '../../stores/mealRateStore';
import { getMealMonthDateRange, formatDateRangeForDisplay } from '../../utils/mealMonthHelpers';
import { aggregateSettlement, calculateSettlement, roundCurrency, type SettlementResult } from '../../utils/settlementCalculations';

const formatCurrency = (amount: number) => `৳${roundCurrency(Math.abs(amount)).toFixed(2)}`;

function SettlementReport({ user }: { user: Member | null }) {
  const tableRef = useRef<HTMLDivElement>(null);
  const range = useMemo(() => getMealMonthDateRange(user), [user]);
  const { currentRate, fetchLatestRate, subscribeToRateChanges, unsubscribeFromRateChanges } = useMealRateStore();
  const { getMemberTotalDeposit } = useDepositStore();
  const [rows, setRows] = useState<SettlementResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const [report] = await Promise.all([
        supabase.rpc('get_global_monthly_report_with_dates', { p_start_date: range.startDate, p_end_date: range.endDate }),
        fetchLatestRate(range.startDate, range.endDate),
      ]);
      if (report.error) throw report.error;
      const members = new Map<string, { name: string; meals: number }>();
      for (const item of report.data || []) {
        const current = members.get(item.member_id) || { name: item.member_name, meals: 0 };
        current.meals += item.breakfast_count + item.lunch_count + item.dinner_count;
        members.set(item.member_id, current);
      }
      const rate = useMealRateStore.getState().currentRate?.meal_rate || 0;
      const next = await Promise.all([...members].map(async ([memberId, item]) => calculateSettlement({ memberId, memberName: item.name, meals: item.meals, deposit: await getMemberTotalDeposit(memberId, range.startDate, range.endDate) }, rate)));
      setRows(next.sort((a, b) => a.memberName.localeCompare(b.memberName)));
      setLastUpdated(new Date());
    } catch (reason) {
      console.error('Settlement load failed:', reason); setError('Failed to load settlement report. Please try again.');
    } finally { setLoading(false); }
  }, [fetchLatestRate, getMemberTotalDeposit, range, user]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener('deposit:changed', refresh);
    const channel = supabase.channel('settlement-inputs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_expenses' }, refresh).subscribe();
    subscribeToRateChanges(range.startDate, range.endDate);
    return () => { window.removeEventListener('deposit:changed', refresh); void supabase.removeChannel(channel); unsubscribeFromRateChanges(); };
  }, [load, range, subscribeToRateChanges, unsubscribeFromRateChanges]);

  useEffect(() => {
    const rate = currentRate?.meal_rate || 0;
    setRows((current) => current.map((row) => calculateSettlement(row, rate)));
  }, [currentRate]);

  const totals = useMemo(() => aggregateSettlement(rows), [rows]);
  const exportCsv = () => {
    const csv = ['Member,Meals,Deposit,Balance', ...rows.map((row) => `${JSON.stringify(row.memberName)},${row.meals},${row.deposit.toFixed(2)},${row.balance.toFixed(2)}`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const link = document.createElement('a'); link.href = url; link.download = `settlement-${range.startDate}-${range.endDate}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="card overflow-hidden">
    <div className="p-4 bg-bg-secondary border-b border-border"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div>
      <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2"><svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101M3.75 4.5h16.5v12H3.75zM15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /></svg>Settlement Report</h3>
      <p className="text-sm text-text-secondary">{formatDateRangeForDisplay(range.startDate, range.endDate)}</p>
      {!loading && rows.length > 0 && <p className="text-sm text-text-secondary mt-1">Meal Rate: <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(currentRate?.meal_rate || 0)}</span></p>}
    </div><div className="flex gap-2"><button onClick={exportCsv} disabled={!rows.length || loading} className="btn-secondary px-3 py-2 rounded-lg text-sm">CSV</button><button onClick={() => setShowReport((value) => !value)} disabled={!rows.length || loading} className="btn-secondary px-3 py-2 rounded-lg text-sm">{showReport ? 'Hide' : 'Show'}</button></div></div></div>
    {loading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" /></div>}
    {error && !loading && <div className="m-4 bg-error/10 border border-error text-error px-4 py-3 rounded-lg">{error}<button onClick={() => void load()} className="ml-2 underline">Retry</button></div>}
    {!loading && !error && !rows.length && <div className="text-center py-12 text-text-secondary">No data available for settlement calculation</div>}
    {showReport && !loading && rows.length > 0 && <div ref={tableRef}><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-bg-tertiary border-b border-border"><th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Member</th><th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">Meals</th><th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">Deposit</th><th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">Balance</th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.memberId} className="border-b border-border hover:bg-bg-secondary transition-colors"><td className="px-4 py-3 text-text-primary font-medium">{row.memberName}</td><td className="px-4 py-3 text-center text-text-secondary">{row.meals || '-'}</td><td className="px-4 py-3 text-right text-text-secondary">{row.deposit ? formatCurrency(row.deposit) : '-'}</td><td className={`px-4 py-3 text-right font-semibold ${row.balance > 0 ? 'text-red-600 dark:text-red-400' : row.balance < 0 ? 'text-green-600 dark:text-green-400' : 'text-text-secondary'}`}>{row.balance > 0 ? `Give ${formatCurrency(row.balance)}` : row.balance < 0 ? `Receive ${formatCurrency(row.balance)}` : 'Settled'}</td></tr>)}
      <tr className="bg-bg-tertiary font-bold border-t-2 border-border"><td className="px-4 py-3">Total</td><td className="px-4 py-3 text-center">{totals.meals}</td><td className="px-4 py-3 text-right">{formatCurrency(totals.deposits)}</td><td className="px-4 py-3 text-right"><span className="text-red-600">Give {formatCurrency(totals.payable)}</span> · <span className="text-green-600">Receive {formatCurrency(totals.receivable)}</span></td></tr>
    </tbody></table></div><div className="mx-4 my-3 p-3 rounded-lg border bg-bg-secondary text-sm text-text-secondary">Settlement values are derived from meal quantities × meal rate − deposits for this billing period.</div>{lastUpdated && <div className="px-4 pb-3 text-right text-xs text-text-tertiary">Last updated: {lastUpdated.toLocaleString()}</div>}</div>}
  </div>;
}
export default SettlementReport;
