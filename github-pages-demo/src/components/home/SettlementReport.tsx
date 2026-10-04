import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Member } from '../../types';
import { supabase } from '../../services/supabase';
import { useDepositStore } from '../../stores/depositStore';
import { useMealRateStore } from '../../stores/mealRateStore';
import {
  getMealMonthDateRange,
  formatDateRangeForDisplay,
} from '../../utils/mealMonthHelpers';
import {
  aggregateSettlement,
  calculateSettlement,
  roundCurrency,
  type SettlementResult,
} from '../../utils/settlementCalculations';
import { getWeightedMealTotal } from '../../constants/meals';

const formatCurrency = (amount: number) =>
  `৳${roundCurrency(Math.abs(amount)).toFixed(2)}`;

type PublicSettlementSnapshotRow = {
  memberId: string;
  memberName: string;
  meals: number;
  deposit: number;
  mealCost: number;
  balance: number;
};

type PublicSettlementSnapshot = {
  period_start: string;
  period_end: string;
  meal_rate: number;
  settlement_rows: Array<{
    memberId?: string;
    memberName?: string;
    meals?: number;
    deposit?: number;
    mealCost?: number;
    balance?: number;
  }>;
  total_meals: number;
  total_deposits: number;
  total_payable: number;
  total_receivable: number;
  last_refreshed_at: string;
};

function SettlementReport({
  user,
  publicView = false,
}: {
  user: Member | null;
  publicView?: boolean;
}) {
  const tableRef = useRef<HTMLDivElement>(null);
  const range = useMemo(() => getMealMonthDateRange(user), [user]);
  const { currentRate, fetchLatestRate, subscribeToRateChanges, unsubscribeFromRateChanges } =
    useMealRateStore();
  const { getMemberTotalDeposit } = useDepositStore();
  const [rows, setRows] = useState<SettlementResult[]>([]);
  const [publicRows, setPublicRows] = useState<PublicSettlementSnapshotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [publicMealRate, setPublicMealRate] = useState(0);
  const [publicTotals, setPublicTotals] = useState({
    meals: 0,
    deposits: 0,
    payable: 0,
    receivable: 0,
  });
  const [publicRange, setPublicRange] = useState(range);

  const load = useCallback(async () => {
    if (!user && !publicView) return;
    setLoading(true);
    setError(null);

    try {
      if (publicView) {
        const { data, error: snapshotError } = await supabase.rpc('get_public_settlement_snapshot');

        if (snapshotError) throw snapshotError;

        const snapshot = (Array.isArray(data) ? data[0] : data) as PublicSettlementSnapshot | undefined;
        if (!snapshot) {
          setPublicRows([]);
          setPublicMealRate(0);
          setPublicTotals({ meals: 0, deposits: 0, payable: 0, receivable: 0 });
          setPublicRange(range);
          setLastUpdated(null);
          return;
        }

        const normalizedRows: PublicSettlementSnapshotRow[] = (
          snapshot.settlement_rows || []
        )
          .map((row) => ({
            memberId: row.memberId || '',
            memberName: row.memberName || '',
            meals: Number(row.meals || 0),
            deposit: Number(row.deposit || 0),
            mealCost: Number(row.mealCost || 0),
            balance: Number(row.balance || 0),
          }))
          .filter((row) => Boolean(row.memberId));

        setPublicRows(normalizedRows);
        setPublicMealRate(Number(snapshot.meal_rate || 0));
        setPublicTotals({
          meals: Number(snapshot.total_meals || 0),
          deposits: Number(snapshot.total_deposits || 0),
          payable: Number(snapshot.total_payable || 0),
          receivable: Number(snapshot.total_receivable || 0),
        });
        setPublicRange({
          startDate: snapshot.period_start,
          endDate: snapshot.period_end,
        });
        setLastUpdated(snapshot.last_refreshed_at ? new Date(snapshot.last_refreshed_at) : null);
        return;
      }

      const [report] = await Promise.all([
        supabase.rpc('get_global_monthly_report_with_dates', {
          p_start_date: range.startDate,
          p_end_date: range.endDate,
        }),
        fetchLatestRate(range.startDate, range.endDate, false),
      ]);

      if (report.error) throw report.error;

      const members = new Map<string, { name: string; meals: number }>();
      for (const item of report.data || []) {
        const current = members.get(item.member_id) || {
          name: item.member_name,
          meals: 0,
        };
        current.meals += getWeightedMealTotal({
          breakfast: item.breakfast_count,
          lunch: item.lunch_count,
          dinner: item.dinner_count,
        });
        members.set(item.member_id, current);
      }

      const snapshot = useMealRateStore.getState().currentRate;
      if (!snapshot) throw new Error('Meal rate is unavailable for the selected period');

      const rate = snapshot.meal_rate;
      const next = await Promise.all(
        [...members].map(async ([memberId, item]) =>
          calculateSettlement(
            {
              memberId,
              memberName: item.name,
              meals: item.meals,
              deposit: await getMemberTotalDeposit(memberId, range.startDate, range.endDate),
            },
            rate,
          ),
        ),
      );

      const sortedRows = next.sort((a, b) => a.memberName.localeCompare(b.memberName));
      setRows(sortedRows);
      setPublicRows([]);
      setPublicMealRate(rate);
      setPublicTotals({
        meals: sortedRows.reduce((sum, row) => sum + row.meals, 0),
        deposits: sortedRows.reduce((sum, row) => sum + row.deposit, 0),
        payable: sortedRows.filter((row) => row.balance > 0).reduce((sum, row) => sum + row.balance, 0),
        receivable: sortedRows.filter((row) => row.balance < 0).reduce((sum, row) => sum + Math.abs(row.balance), 0),
      });
      setLastUpdated(new Date());
    } catch (reason) {
      console.error('Settlement load failed:', reason);
      setError('Failed to load settlement report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fetchLatestRate, getMemberTotalDeposit, publicView, range, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (publicView) return;

    const refresh = () => void load();
    window.addEventListener('deposit:changed', refresh);

    const channel = supabase
      .channel('settlement-inputs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_expenses' }, refresh)
      .subscribe();

    subscribeToRateChanges(range.startDate, range.endDate);

    return () => {
      window.removeEventListener('deposit:changed', refresh);
      void supabase.removeChannel(channel);
      unsubscribeFromRateChanges();
    };
  }, [load, publicView, range, subscribeToRateChanges, unsubscribeFromRateChanges]);

  useEffect(() => {
    if (publicView) return;
    const rate = currentRate?.meal_rate || 0;
    setRows((current) => current.map((row) => calculateSettlement(row, rate)));
  }, [currentRate, publicView]);

  const totals = useMemo(() => aggregateSettlement(rows), [rows]);
  const displayRows = publicView ? publicRows : rows;
  const displayTotals = publicView ? publicTotals : totals;
  const displayMealRate = publicView ? publicMealRate : currentRate?.meal_rate || 0;
  const displayRange = publicView ? publicRange : range;

  const exportCsv = () => {
    const csv = [
      'Member,Meals,Deposit,Balance',
      ...displayRows.map(
        (row) =>
          `${JSON.stringify(row.memberName)},${row.meals},${row.deposit.toFixed(2)},${row.balance.toFixed(2)}`,
      ),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `settlement-${displayRange.startDate}-${displayRange.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card overflow-hidden">
      <div className="p-4 bg-bg-secondary border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.25 18.75a60.07 60.07 0 0115.797 2.101M3.75 4.5h16.5v12H3.75zM15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settlement Report
            </h3>
            <p className="text-sm text-text-secondary">
              {formatDateRangeForDisplay(displayRange.startDate, displayRange.endDate)}
            </p>
            {!loading && displayRows.length > 0 && (
              <p className="text-sm text-text-secondary mt-1">
                Meal Rate:{' '}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {formatCurrency(displayMealRate)}
                </span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              disabled={!displayRows.length || loading}
              className="btn-secondary px-3 py-2 rounded-lg text-sm"
            >
              CSV
            </button>
            <button
              onClick={() => setShowReport((value) => !value)}
              disabled={!displayRows.length || loading}
              className="btn-secondary px-3 py-2 rounded-lg text-sm"
            >
              {showReport ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <div className="m-4 bg-error/10 border border-error text-error px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => void load()} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && !displayRows.length && (
        <div className="text-center py-12 text-text-secondary">
          No data available for settlement calculation
        </div>
      )}

      {showReport && !loading && displayRows.length > 0 && (
        <div ref={tableRef}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-tertiary border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                    Member
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                    Meals
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">
                    Deposit
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => (
                  <tr key={row.memberId} className="border-b border-border hover:bg-bg-secondary transition-colors">
                    <td className="px-4 py-3 text-text-primary font-medium">{row.memberName}</td>
                    <td className="px-4 py-3 text-center text-text-secondary">{row.meals || '-'}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">
                      {row.deposit ? formatCurrency(row.deposit) : '-'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        row.balance > 0
                          ? 'text-red-600 dark:text-red-400'
                          : row.balance < 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-text-secondary'
                      }`}
                    >
                      {row.balance > 0
                        ? `দিবেন ${formatCurrency(row.balance)}`
                        : row.balance < 0
                          ? `পাবেন ${formatCurrency(row.balance)}`
                          : 'Settled'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-bg-tertiary font-bold border-t-2 border-border">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-center">{displayTotals.meals}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(displayTotals.deposits)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-red-600">দিবেন {formatCurrency(displayTotals.payable)}</span>{' '}
                    · <span className="text-green-600">পাবেন {formatCurrency(displayTotals.receivable)}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mx-4 my-3 p-3 rounded-lg border bg-bg-secondary text-sm text-text-secondary">
            Settlement values are derived from meal quantities × meal rate − deposits for this billing period.
          </div>
          {lastUpdated && (
            <div className="px-4 pb-3 text-right text-xs text-text-tertiary">
              Last refreshed: {lastUpdated.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SettlementReport;
