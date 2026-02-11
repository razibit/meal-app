import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDepositStore } from '../../stores/depositStore';
import { Member } from '../../types';
import { getMealMonthDateRange, formatDateRangeForDisplay } from '../../utils/mealMonthHelpers';

interface DepositReportProps {
  user: Member | null;
}

function DepositReport({ user }: DepositReportProps) {
  const { depositReport, loading, error, fetchDepositReport } = useDepositStore();
  const [showReport, setShowReport] = useState(false);

  // Get the current meal month date range for the user
  const dateRange = useMemo(() => getMealMonthDateRange(user), [user]);

  const loadReport = useCallback(async () => {
    if (!user) return;
    await fetchDepositReport(dateRange.startDate, dateRange.endDate);
  }, [user, dateRange, fetchDepositReport]);

  useEffect(() => {
    if (showReport) {
      loadReport();
    }
  }, [showReport, loadReport]);

  // Group deposits by depositor
  const groupedDeposits = useMemo(() => {
    const grouped = new Map<string, {
      depositorId: string;
      depositorName: string;
      totalAmount: number;
      rows: Array<{
        date: string;
        addedBy: string;
        amount: number;
        details?: string;
      }>;
    }>();

    depositReport.forEach((row) => {
      if (!grouped.has(row.depositor_id)) {
        grouped.set(row.depositor_id, {
          depositorId: row.depositor_id,
          depositorName: row.depositor_name,
          totalAmount: row.total_amount,
          rows: [],
        });
      }

      const group = grouped.get(row.depositor_id)!;
      group.rows.push({
        date: row.deposit_date,
        addedBy: row.added_by_name,
        amount: row.amount,
        details: row.details,
      });
    });

    // Sort members alphabetically and their rows by date (newest first)
    return Array.from(grouped.values())
      .sort((a, b) => a.depositorName.localeCompare(b.depositorName))
      .map(group => ({
        ...group,
        rows: group.rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      }));
  }, [depositReport]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const grandTotal = useMemo(() => {
    return groupedDeposits.reduce((sum, group) => sum + group.totalAmount, 0);
  }, [groupedDeposits]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-text-primary">Deposit Report</h3>
          <p className="text-sm text-text-secondary mt-1">
            {formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate)}
          </p>
        </div>
        <button
          onClick={() => setShowReport(!showReport)}
          className="btn-secondary px-4 py-2 rounded-lg font-medium"
          disabled={loading}
        >
          {showReport ? 'Hide' : 'Show'}
        </button>
      </div>

      {showReport && (
        <>
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-error/10 border border-error text-error px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
          )}

          {/* Report Content */}
          {!loading && groupedDeposits.length > 0 && (
            <div className="space-y-4">
              {groupedDeposits.map((group) => (
                <div
                  key={group.depositorId}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  {/* Depositor Header */}
                  <div className="bg-bg-tertiary px-4 py-3 flex items-center justify-between">
                    <h4 className="font-semibold text-text-primary">
                      {group.depositorName}
                    </h4>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      ৳ {group.totalAmount.toFixed(2)}
                    </span>
                  </div>

                  {/* Deposit Rows */}
                  <div className="divide-y divide-border">
                    {group.rows.map((row, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 hover:bg-bg-secondary transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-sm text-text-secondary">
                                {formatDate(row.date)}
                              </span>
                              <span className="text-sm text-text-tertiary">
                                Added by: <span className="text-text-secondary">{row.addedBy}</span>
                              </span>
                            </div>
                            {row.details && (
                              <p className="text-sm text-text-secondary mt-1">
                                {row.details}
                              </p>
                            )}
                          </div>
                          <span className="text-base font-semibold text-text-primary ml-4">
                            ৳ {row.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Grand Total */}
              {groupedDeposits.length > 1 && (
                <div className="bg-bg-tertiary rounded-lg px-4 py-3 flex items-center justify-between font-bold">
                  <span className="text-text-primary">Grand Total</span>
                  <span className="text-xl text-green-600 dark:text-green-400">
                    ৳ {grandTotal.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && groupedDeposits.length === 0 && !error && (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 mx-auto text-text-tertiary mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-text-secondary">No deposits for this period</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DepositReport;
