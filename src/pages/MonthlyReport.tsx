import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { MonthlyReportRow } from '../types';

function MonthlyReport() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportData, setReportData] = useState<MonthlyReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlyReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_monthly_report', {
          target_month: `${selectedMonth}-01`
        });

      if (rpcError) throw rpcError;
      
      setReportData(data || []);
    } catch (err) {
      console.error('Error fetching monthly report:', err);
      setError('Failed to load monthly report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchMonthlyReport();
  }, [fetchMonthlyReport]);

  const handleMonthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  }, []);

  const handleExportCSV = useCallback(() => {
    if (reportData.length === 0) return;

    // Create CSV content
    const headers = ['Name', 'Morning Meals', 'Night Meals', 'Monthly Total'];
    const rows = reportData.map(row => [
      row.member_name,
      row.morning_count,
      row.night_count,
      row.monthly_total
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `meal-report-${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [reportData, selectedMonth]);

  // Memoize totals calculation
  const totals = useMemo(() => {
    return reportData.reduce(
      (acc, row) => ({
        morning: acc.morning + row.morning_count,
        night: acc.night + row.night_count,
        total: acc.total + row.monthly_total
      }),
      { morning: 0, night: 0, total: 0 }
    );
  }, [reportData]);

  return (
    <div className="p-4 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4 text-text-primary">Monthly Meal Report</h2>
        
        {/* Month Selector and Export Button */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="month-select" className="text-text-secondary font-medium">
              Select Month:
            </label>
            <input
              id="month-select"
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="input px-3 py-2 rounded-lg border-2 border-border bg-bg-primary text-text-primary"
              max={new Date().toISOString().slice(0, 7)}
            />
          </div>
          
          <button
            onClick={handleExportCSV}
            disabled={reportData.length === 0 || loading}
            className="btn-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-error/10 border border-error text-error px-4 py-3 rounded-lg animate-slide-down">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      )}

      {/* Report Table */}
      {!loading && reportData.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-tertiary border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                    Name
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                    Morning Meals
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                    Night Meals
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                    Monthly Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row) => (
                  <tr
                    key={row.member_id}
                    className="border-b border-border hover:bg-bg-secondary transition-colors"
                  >
                    <td className="px-4 py-3 text-text-primary font-medium">
                      {row.member_name}
                    </td>
                    <td className="px-4 py-3 text-center text-text-secondary">
                      {row.morning_count}
                    </td>
                    <td className="px-4 py-3 text-center text-text-secondary">
                      {row.night_count}
                    </td>
                    <td className="px-4 py-3 text-center text-text-primary font-semibold">
                      {row.monthly_total}
                    </td>
                  </tr>
                ))}
                
                {/* Totals Row */}
                <tr className="bg-bg-tertiary font-bold">
                  <td className="px-4 py-3 text-text-primary">
                    Total
                  </td>
                  <td className="px-4 py-3 text-center text-text-primary">
                    {totals.morning}
                  </td>
                  <td className="px-4 py-3 text-center text-text-primary">
                    {totals.night}
                  </td>
                  <td className="px-4 py-3 text-center text-text-primary">
                    {totals.total}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && reportData.length === 0 && !error && (
        <div className="card text-center py-12">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-text-secondary">No meal data available for this month</p>
        </div>
      )}
    </div>
  );
}

export default MonthlyReport;
