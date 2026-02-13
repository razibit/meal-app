import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGroceryExpenseStore } from '../../stores/groceryExpenseStore';
import { GroceryExpenseReportRow, Member } from '../../types';
import { getMealMonthDateRange, formatDateRangeForDisplay } from '../../utils/mealMonthHelpers';

interface GroceryExpenseReportProps {
  user: Member | null;
}

function GroceryExpenseReport({ user }: GroceryExpenseReportProps) {
  const { expenseReport, loading, error, fetchExpenseReport } = useGroceryExpenseStore();
  const [showReport, setShowReport] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeType, setActiveType] = useState<'cash' | 'credit'>('cash');

  // Get the current meal month date range for the user
  const dateRange = useMemo(() => getMealMonthDateRange(user), [user]);

  const loadReport = useCallback(async () => {
    if (!user) return;
    await fetchExpenseReport(dateRange.startDate, dateRange.endDate);
    setHasLoaded(true);
  }, [user, dateRange, fetchExpenseReport]);

  useEffect(() => {
    setHasLoaded(false);
    loadReport();
  }, [loadReport]);

  // Filter expenses by transaction type
  const filteredExpenses = useMemo(() => {
    return expenseReport.filter(
      (row: GroceryExpenseReportRow) => row.transaction_type === activeType
    );
  }, [expenseReport, activeType]);

  // Totals
  const cashTotal = useMemo(() => {
    return expenseReport
      .filter((row: GroceryExpenseReportRow) => row.transaction_type === 'cash')
      .reduce((sum: number, row: GroceryExpenseReportRow) => sum + Number(row.amount), 0);
  }, [expenseReport]);

  const creditTotal = useMemo(() => {
    return expenseReport
      .filter((row: GroceryExpenseReportRow) => row.transaction_type === 'credit')
      .reduce((sum: number, row: GroceryExpenseReportRow) => sum + Number(row.amount), 0);
  }, [expenseReport]);

  const grandTotal = cashTotal + creditTotal;

  const filteredTotal = activeType === 'cash' ? cashTotal : creditTotal;

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

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-text-primary">Grocery Expense Report</h3>
          <p className="text-sm text-text-secondary mt-1">
            {formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate)}
          </p>
          {hasLoaded && !loading && expenseReport.length > 0 && (
            <p className="text-sm text-text-secondary mt-1">
              Cash: <span className="font-medium text-text-primary">৳{cashTotal.toFixed(2)}</span>
              {' · '}
              Credit: <span className="font-medium text-text-primary">৳{creditTotal.toFixed(2)}</span>
              {' · '}
              Total: <span className="font-medium text-text-primary">৳{grandTotal.toFixed(2)}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-text-tertiary">Grand Total</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              ৳ {!hasLoaded && loading ? '...' : grandTotal.toFixed(2)}
            </p>
          </div>
          <button
            onClick={() => setShowReport(!showReport)}
            className="btn-secondary px-4 py-2 rounded-lg font-medium"
            disabled={loading && !hasLoaded}
          >
            {showReport ? 'Hide' : 'Show'}
          </button>
        </div>
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
          {!loading && (
            <>
              {/* Toggle Switch */}
              <div className="mb-4 flex items-center justify-center">
                <div className="inline-flex rounded-lg bg-bg-tertiary p-1">
                  <button
                    onClick={() => setActiveType('cash')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeType === 'cash'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    💵 Cash
                  </button>
                  <button
                    onClick={() => setActiveType('credit')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeType === 'credit'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    💳 Credit
                  </button>
                </div>
              </div>

              {/* Table */}
              {filteredExpenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-bg-tertiary border-b border-border">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                          Added By
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                          Shopper
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                          Details
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((row: GroceryExpenseReportRow) => (
                        <tr
                          key={row.expense_id}
                          className="border-b border-border hover:bg-bg-secondary transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                            {formatDate(row.expense_date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {row.added_by_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-primary font-medium">
                            {row.shopper_name}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              row.transaction_type === 'cash'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            }`}>
                              {row.transaction_type === 'cash' ? '💵' : '💳'} {row.transaction_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary max-w-[200px] truncate">
                            {row.details || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-primary font-semibold text-right">
                            ৳{Number(row.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}

                      {/* Totals Row */}
                      <tr className="bg-bg-tertiary font-bold">
                        <td colSpan={5} className="px-4 py-3 text-text-primary">
                          Total ({activeType === 'cash' ? 'Cash' : 'Credit'})
                        </td>
                        <td className="px-4 py-3 text-text-primary text-right">
                          ৳{filteredTotal.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
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
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                    />
                  </svg>
                  <p className="text-text-secondary">
                    No {activeType} grocery expenses for this period
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default GroceryExpenseReport;
