import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useMealRateStore } from '../../stores/mealRateStore';
import { useEggStore } from '../../stores/eggStore';
import { useGroceryExpenseStore } from '../../stores/groceryExpenseStore';
import { Member, GlobalReportRow } from '../../types';
import { getMealMonthDateRange, formatDateRangeForDisplay } from '../../utils/mealMonthHelpers';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SettlementReportProps {
  user: Member | null;
}

interface SettlementRow {
  memberId: string;
  memberName: string;
  totalMeals: number;
  totalEggs: number;
  mealCost: number;
  eggCost: number;
  deposit: number;
  finalAmount: number; // positive = Will Give, negative = Will Receive
}

function SettlementReport({ user }: SettlementReportProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const { currentRate, fetchLatestRate, subscribeToRateChanges, unsubscribeFromRateChanges } = useMealRateStore();
  const { eggPrice, fetchEggPrice } = useEggStore();
  const { getBalance } = useGroceryExpenseStore();

  const [settlementData, setSettlementData] = useState<SettlementRow[]>([]);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showReport, setShowReport] = useState(true);
  const [exporting, setExporting] = useState(false);

  const dateRange = useMemo(() => getMealMonthDateRange(user), [user]);
  const mealRate = currentRate?.meal_rate ?? 0;

  // Fetch all settlement data
  const fetchSettlementData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Parallel fetch: global report, deposits per member, egg price, balance, latest rate
      const [globalReportRes] = await Promise.all([
        supabase.rpc('get_global_monthly_report_with_dates', {
          p_start_date: dateRange.startDate,
          p_end_date: dateRange.endDate,
        }),
        fetchEggPrice(),
      ]);

      if (globalReportRes.error) throw globalReportRes.error;

      const globalData: GlobalReportRow[] = globalReportRes.data || [];

      // Build per-member totals from global report
      const memberMap = new Map<string, { name: string; meals: number; eggs: number }>();
      globalData.forEach((row) => {
        if (!memberMap.has(row.member_id)) {
          memberMap.set(row.member_id, { name: row.member_name, meals: 0, eggs: 0 });
        }
        const m = memberMap.get(row.member_id)!;
        m.meals += (row.morning_count || 0) + (row.night_count || 0);
        m.eggs += row.egg_count || 0;
      });

      // Fetch deposit totals for each member in parallel
      const memberIds = Array.from(memberMap.keys());
      const depositPromises = memberIds.map((id) =>
        supabase.rpc('get_member_total_deposit', {
          p_member_id: id,
          p_start_date: dateRange.startDate,
          p_end_date: dateRange.endDate,
        })
      );

      const depositResults = await Promise.all(depositPromises);

      // Also fetch available balance (total deposits - total cash expenses)
      // and total credit expenses for the verification formula
      const [balance, totalExpRes, cashExpRes] = await Promise.all([
        getBalance(dateRange.startDate, dateRange.endDate),
        supabase.rpc('get_total_grocery_expenses', {
          p_start_date: dateRange.startDate,
          p_end_date: dateRange.endDate,
        }),
        supabase.rpc('get_total_cash_grocery_expenses', {
          p_start_date: dateRange.startDate,
          p_end_date: dateRange.endDate,
        }),
      ]);
      setAvailableBalance(balance);
      const creditAmount = Math.max(0, (totalExpRes.data || 0) - (cashExpRes.data || 0));
      setTotalCredit(creditAmount);

      // Fetch latest meal rate
      await fetchLatestRate(dateRange.startDate, dateRange.endDate);

      // We need the latest rate from the store — it may not have updated yet,
      // so we'll use the value from the store at render time via mealRate.
      // But we also need eggPrice — get it from the store.
      const currentEggPrice = useEggStore.getState().eggPrice;
      const latestRate = useMealRateStore.getState().currentRate?.meal_rate ?? 0;

      // Build settlement rows
      const rows: SettlementRow[] = memberIds.map((id, index) => {
        const member = memberMap.get(id)!;
        const depositData = depositResults[index];
        const deposit = depositData.error ? 0 : (depositData.data || 0);

        const mealCost = member.meals * latestRate;
        const eggCost = member.eggs * currentEggPrice;
        const finalAmount = mealCost + eggCost - deposit;

        return {
          memberId: id,
          memberName: member.name,
          totalMeals: member.meals,
          totalEggs: member.eggs,
          mealCost,
          eggCost,
          deposit,
          finalAmount,
        };
      });

      // Sort alphabetically
      rows.sort((a, b) => a.memberName.localeCompare(b.memberName));

      setSettlementData(rows);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching settlement data:', err);
      setError('Failed to load settlement report. Please try again.');
      setLoading(false);
    }
  }, [user, dateRange, fetchEggPrice, fetchLatestRate, getBalance]);

  // Initial load
  useEffect(() => {
    fetchSettlementData();
  }, [fetchSettlementData]);

  // Subscribe to meal rate changes to auto-refresh
  useEffect(() => {
    if (!user) return;

    subscribeToRateChanges(dateRange.startDate, dateRange.endDate);

    return () => {
      unsubscribeFromRateChanges();
    };
  }, [user, dateRange, subscribeToRateChanges, unsubscribeFromRateChanges]);

  // Recalculate when meal rate or egg price changes
  useEffect(() => {
    if (settlementData.length === 0) return;

    const latestRate = currentRate?.meal_rate ?? 0;
    const currentEggPrice = eggPrice;

    setSettlementData((prev) =>
      prev.map((row) => {
        const mealCost = row.totalMeals * latestRate;
        const eggCost = row.totalEggs * currentEggPrice;
        const finalAmount = mealCost + eggCost - row.deposit;
        return { ...row, mealCost, eggCost, finalAmount };
      })
    );
    setLastUpdated(new Date());
  }, [currentRate, eggPrice]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchSettlementData, 60000);
    return () => clearInterval(interval);
  }, [fetchSettlementData]);

  // Computed totals
  const totalWillGive = useMemo(() => {
    return settlementData
      .filter((r) => r.finalAmount > 0)
      .reduce((sum, r) => sum + r.finalAmount, 0);
  }, [settlementData]);

  const totalWillReceive = useMemo(() => {
    return settlementData
      .filter((r) => r.finalAmount < 0)
      .reduce((sum, r) => sum + Math.abs(r.finalAmount), 0);
  }, [settlementData]);

  // Verification: Total Will Give = Total Will Receive + Credit - Balance
  const verificationExpected = totalWillReceive + totalCredit - availableBalance;
  const verificationMatches = Math.abs(totalWillGive - verificationExpected) < 0.5;

  // ---- Export Handlers ----

  const handleExportPNG = useCallback(async () => {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `settlement-report-${dateRange.startDate}-to-${dateRange.endDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('PNG export error:', err);
    } finally {
      setExporting(false);
    }
  }, [dateRange]);

  const handleExportPDF = useCallback(() => {
    if (settlementData.length === 0) return;

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Settlement Report', 14, 20);

    doc.setFontSize(11);
    const displayRange = formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate);
    doc.text(displayRange, 14, 28);

    doc.setFontSize(10);
    doc.text(`Meal Rate: ${mealRate.toFixed(2)} Tk | Egg Price: ${eggPrice.toFixed(2)} Tk`, 14, 35);

    const tableData = settlementData.map((row) => [
      row.memberName,
      `${row.totalMeals}`,
      `${row.totalEggs}`,
      `${row.deposit.toFixed(2)}`,
      row.finalAmount < 0 ? Math.abs(row.finalAmount).toFixed(2) : '-',
      row.finalAmount > 0 ? row.finalAmount.toFixed(2) : '-',
    ]);

    // Totals row
    tableData.push([
      'Total',
      '',
      '',
      '',
      totalWillReceive.toFixed(2),
      totalWillGive.toFixed(2),
    ]);

    autoTable(doc, {
      head: [['Name', 'Meals', 'Eggs', 'Deposit', 'Will Receive', 'Will Give']],
      body: tableData,
      startY: 40,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: { halign: 'center' },
      columnStyles: { 0: { halign: 'left' } },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [229, 231, 235];
        }
      },
    });

    // Verification section
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Verification: Total Will Give (${totalWillGive.toFixed(2)}) = Total Will Receive (${totalWillReceive.toFixed(2)}) + Credit (${totalCredit.toFixed(2)}) - Balance (${availableBalance.toFixed(2)})`,
      14,
      finalY + 10
    );

    doc.save(`settlement-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`);
  }, [settlementData, dateRange, mealRate, eggPrice, totalWillGive, totalWillReceive, totalCredit, availableBalance]);

  const handleExportCSV = useCallback(() => {
    if (settlementData.length === 0) return;

    const headers = ['Name', 'Meals', 'Eggs', 'Deposit (Tk)', 'Will Receive (Tk)', 'Will Give (Tk)'];
    const rows = settlementData.map((row) => [
      row.memberName,
      row.totalMeals,
      row.totalEggs,
      row.deposit.toFixed(2),
      row.finalAmount < 0 ? Math.abs(row.finalAmount).toFixed(2) : '',
      row.finalAmount > 0 ? row.finalAmount.toFixed(2) : '',
    ]);

    rows.push(['Total', '', '', '', totalWillReceive.toFixed(2), totalWillGive.toFixed(2)]);
    rows.push([]);
    rows.push([`Meal Rate: ${mealRate.toFixed(2)} Tk`, `Egg Price: ${eggPrice.toFixed(2)} Tk`, `Credit: ${totalCredit.toFixed(2)} Tk`, `Balance: ${availableBalance.toFixed(2)} Tk`]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `settlement-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [settlementData, dateRange, mealRate, eggPrice, totalWillGive, totalWillReceive, totalCredit, availableBalance]);

  // ---- Render ----

  const formatCurrency = (amount: number) => `৳${Math.abs(amount).toFixed(2)}`;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-bg-secondary border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
              Settlement Report
            </h3>
            <p className="text-sm text-text-secondary">
              {formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate)}
            </p>
            {!loading && settlementData.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="text-sm text-text-secondary">
                  Meal Rate: <span className="font-semibold text-blue-600 dark:text-blue-400">৳{mealRate.toFixed(2)}</span>
                </span>
                <span className="text-text-tertiary">·</span>
                <span className="text-sm text-text-secondary">
                  Egg Price: <span className="font-semibold text-amber-600 dark:text-amber-400">৳{eggPrice.toFixed(2)}</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Export buttons */}
            <button
              onClick={handleExportPNG}
              disabled={settlementData.length === 0 || loading || exporting}
              className="btn-secondary px-3 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
              title="Export as PNG"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21z" />
              </svg>
              PNG
            </button>
            <button
              onClick={handleExportPDF}
              disabled={settlementData.length === 0 || loading}
              className="btn-primary px-3 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
              title="Export as PDF"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
            <button
              onClick={handleExportCSV}
              disabled={settlementData.length === 0 || loading}
              className="btn-secondary px-3 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
              title="Export as CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV
            </button>
            <button
              onClick={() => setShowReport(!showReport)}
              disabled={settlementData.length === 0 || loading}
              className="btn-secondary px-3 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showReport ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showReport ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="m-4 bg-error/10 border border-error text-error px-4 py-3 rounded-lg">
          {error}
          <button onClick={fetchSettlementData} className="ml-2 underline text-sm">
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && settlementData.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-text-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-text-secondary">No data available for settlement calculation</p>
        </div>
      )}

      {/* Table + Verification (collapsible) */}
      {showReport && !loading && settlementData.length > 0 && (
        <div ref={tableRef}>
          {/* Settlement Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-tertiary border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Name</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">Meals</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">Eggs</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">Deposit</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-green-700 dark:text-green-400">
                    Will Receive
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-red-700 dark:text-red-400">
                    Will Give
                  </th>
                </tr>
              </thead>
              <tbody>
                {settlementData.map((row) => (
                  <tr
                    key={row.memberId}
                    className="border-b border-border hover:bg-bg-secondary transition-colors"
                  >
                    <td className="px-4 py-3 text-text-primary font-medium">{row.memberName}</td>
                    <td className="px-4 py-3 text-center text-text-secondary">{row.totalMeals || '-'}</td>
                    <td className="px-4 py-3 text-center text-text-secondary">{row.totalEggs || '-'}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">
                      {row.deposit > 0 ? formatCurrency(row.deposit) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.finalAmount < 0 ? (
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(row.finalAmount)}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.finalAmount > 0 ? (
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(row.finalAmount)}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">-</span>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Totals Row */}
                <tr className="bg-bg-tertiary font-bold border-t-2 border-border">
                  <td className="px-4 py-3 text-text-primary" colSpan={4}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                    {formatCurrency(totalWillReceive)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                    {formatCurrency(totalWillGive)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Verification Section */}
          <div className={`mx-4 mb-4 mt-3 p-3 rounded-lg border text-sm ${
            verificationMatches
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          }`}>
            <div className="flex items-start gap-2">
              {verificationMatches ? (
                <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              )}
              <div className="flex-1">
                <p className={`font-semibold ${
                  verificationMatches
                    ? 'text-green-800 dark:text-green-300'
                    : 'text-amber-800 dark:text-amber-300'
                }`}>
                  Verification {verificationMatches ? 'Passed' : 'Mismatch'}
                </p>
                <p className={`mt-1 ${
                  verificationMatches
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}>
                  Total Will Give ({formatCurrency(totalWillGive)}) = Total Will Receive ({formatCurrency(totalWillReceive)}) + Credit ({formatCurrency(totalCredit)}) − Balance ({formatCurrency(availableBalance)})
                </p>
                {!verificationMatches && (
                  <p className="text-amber-600 dark:text-amber-400 mt-1 text-xs">
                    Expected: {formatCurrency(verificationExpected)} | Actual: {formatCurrency(totalWillGive)} | Diff: {formatCurrency(Math.abs(totalWillGive - verificationExpected))}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="px-4 pb-3 flex items-center justify-end gap-1.5 text-xs text-text-tertiary">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Last updated: {lastUpdated.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SettlementReport;
