import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { DailyReportRow } from '../types';
import { useAuthStore } from '../stores/authStore';
import { getMealMonthDateRange, formatDateRangeForDisplay } from '../utils/mealMonthHelpers';
import GlobalMonthlyReport from '../components/home/GlobalMonthlyReport';
import DepositReport from '../components/home/DepositReport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function MonthlyReport() {
  const { user } = useAuthStore();
  const [reportData, setReportData] = useState<DailyReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the current meal month date range for the user
  const dateRange = useMemo(() => getMealMonthDateRange(user), [user]);

  const fetchMemberReport = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Use the new function with custom date ranges
      const { data, error: rpcError } = await supabase
        .rpc('get_member_monthly_report_with_dates', {
          p_member_id: user.id,
          p_start_date: dateRange.startDate,
          p_end_date: dateRange.endDate
        });

      if (rpcError) throw rpcError;
      
      setReportData(data || []);
    } catch (err) {
      console.error('Error fetching member report:', err);
      setError('Failed to load monthly report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  useEffect(() => {
    fetchMemberReport();
  }, [fetchMemberReport]);

  // Memoize totals calculation
  const totals = useMemo(() => {
    return reportData.reduce(
      (acc, row) => ({
        morning: acc.morning + row.morning_count,
        night: acc.night + row.night_count,
        eggs: acc.eggs + row.egg_count,
      }),
      { morning: 0, night: 0, eggs: 0 }
    );
  }, [reportData]);

  const handleExportCSV = useCallback(() => {
    if (reportData.length === 0) return;

    // Create CSV content
    const headers = ['Date', 'Morning', 'Night', 'Eggs'];
    const rows = reportData.map(row => {
      const date = new Date(row.meal_date + 'T00:00:00');
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return [
        dateStr,
        row.morning_count,
        row.night_count,
        row.egg_count
      ];
    });

    // Add totals row
    rows.push(['Total', totals.morning, totals.night, totals.eggs]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `my-meal-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [reportData, totals, dateRange]);

  const handleExportPDF = useCallback(() => {
    if (reportData.length === 0) return;

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('My Monthly Meal Report', 14, 20);
    
    // Add date range
    const displayRange = formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate);
    doc.setFontSize(12);
    doc.text(displayRange, 14, 28);
    
    // Prepare table data
    const tableData = reportData.map(row => {
      const date = new Date(row.meal_date + 'T00:00:00');
      const dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      });
      return [
        dateStr,
        row.morning_count.toString(),
        row.night_count.toString(),
        row.egg_count.toString()
      ];
    });
    
    // Add totals row
    tableData.push([
      'Total',
      totals.morning.toString(),
      totals.night.toString(),
      totals.eggs.toString()
    ]);
    
    // Generate table with alternating row colors
    autoTable(doc, {
      head: [['Date', 'Morning', 'Night', 'Eggs']],
      body: tableData,
      startY: 35,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246], // Blue color
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'left' } // Date column left-aligned
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245] // Light grey for alternate rows
      },
      footStyles: {
        fillColor: [229, 231, 235], // Grey for totals row
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      didParseCell: (data) => {
        // Make the last row (totals) bold
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [229, 231, 235];
        }
      }
    });
    
    // Save the PDF
    doc.save(`my-meal-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`);
  }, [reportData, totals, dateRange]);

  return (
    <div className="p-4 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4 text-text-primary">My Monthly Report</h2>
        
        {/* Date Range Display and Export Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-text-secondary">Report Period:</p>
            <p className="text-lg font-semibold text-text-primary">
              {formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate)}
            </p>
            <p className="text-xs text-text-tertiary">
              Configure your meal month dates in{' '}
              <a href="/preferences" className="text-primary hover:underline">
                Preferences
              </a>
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
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
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Export PDF
            </button>
            
            <button
              onClick={handleExportCSV}
              disabled={reportData.length === 0 || loading}
              className="btn-secondary px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    Date
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                    Morning
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                    Night
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">
                    Eggs
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row) => {
                  const date = new Date(row.meal_date + 'T00:00:00');
                  const dateStr = date.toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric' 
                  });
                  const hasData = row.morning_count > 0 || row.night_count > 0 || row.egg_count > 0;
                  
                  return (
                    <tr
                      key={row.meal_date}
                      className={`border-b border-border transition-colors ${
                        hasData ? 'hover:bg-bg-secondary' : 'opacity-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-text-primary font-medium">
                        {dateStr}
                      </td>
                      <td className="px-4 py-3 text-center text-text-secondary">
                        {row.morning_count > 0 ? row.morning_count : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-text-secondary">
                        {row.night_count > 0 ? row.night_count : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-text-secondary">
                        {row.egg_count > 0 ? row.egg_count : '-'}
                      </td>
                    </tr>
                  );
                })}
                
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
                    {totals.eggs}
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
          <p className="text-text-secondary">No meal data available for this period</p>
        </div>
      )}

      {/* Global Monthly Report Section */}
      <div className="mt-8">
        <GlobalMonthlyReport user={user} />
      </div>

      {/* Deposit Report Section */}
      <div className="mt-8">
        <DepositReport user={user} />
      </div>
    </div>
  );
}

export default MonthlyReport;
