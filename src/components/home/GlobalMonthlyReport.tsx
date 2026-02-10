import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { GlobalReportRow, MemberTotals, Member } from '../../types';
import { getMealMonthDateRange, formatDateRangeForDisplay } from '../../utils/mealMonthHelpers';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface GlobalMonthlyReportProps {
  user: Member | null;
}

function GlobalMonthlyReport({ user }: GlobalMonthlyReportProps) {
  const [reportData, setReportData] = useState<GlobalReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Get the current meal month date range for the user
  const dateRange = useMemo(() => getMealMonthDateRange(user), [user]);

  const fetchGlobalReport = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'get_global_monthly_report_with_dates',
        {
          p_start_date: dateRange.startDate,
          p_end_date: dateRange.endDate,
        }
      );

      if (rpcError) throw rpcError;

      setReportData(data || []);
    } catch (err) {
      console.error('Error fetching global report:', err);
      setError('Failed to load global monthly report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  useEffect(() => {
    fetchGlobalReport();
  }, [fetchGlobalReport]);

  // Get unique members from the data
  const members = useMemo(() => {
    const memberMap = new Map<string, { id: string; name: string }>();
    reportData.forEach((row) => {
      if (!memberMap.has(row.member_id)) {
        memberMap.set(row.member_id, {
          id: row.member_id,
          name: row.member_name,
        });
      }
    });
    return Array.from(memberMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [reportData]);

  // Get unique dates
  const dates = useMemo(() => {
    const dateSet = new Set<string>();
    reportData.forEach((row) => dateSet.add(row.meal_date));
    return Array.from(dateSet).sort();
  }, [reportData]);

  // Create a lookup map for quick access: date -> member_id -> row data
  const dataMap = useMemo(() => {
    const map = new Map<string, Map<string, GlobalReportRow>>();
    reportData.forEach((row) => {
      if (!map.has(row.meal_date)) {
        map.set(row.meal_date, new Map());
      }
      map.get(row.meal_date)!.set(row.member_id, row);
    });
    return map;
  }, [reportData]);

  // Calculate per-member totals
  const memberTotals = useMemo(() => {
    const totals: MemberTotals[] = members.map((member) => {
      const memberData = reportData.filter((r) => r.member_id === member.id);
      return {
        member_id: member.id,
        member_name: member.name,
        morning: memberData.reduce((sum, r) => sum + r.morning_count, 0),
        night: memberData.reduce((sum, r) => sum + r.night_count, 0),
        eggs: memberData.reduce((sum, r) => sum + r.egg_count, 0),
      };
    });
    return totals;
  }, [reportData, members]);

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    return memberTotals.reduce(
      (acc, member) => ({
        morning: acc.morning + member.morning,
        night: acc.night + member.night,
        eggs: acc.eggs + member.eggs,
        totalMeals: acc.totalMeals + member.morning + member.night,
      }),
      { morning: 0, night: 0, eggs: 0, totalMeals: 0 }
    );
  }, [memberTotals]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderCellValue = (value: number) => {
    return value > 0 ? value : '-';
  };

  // CSV Export
  const handleExportCSV = useCallback(() => {
    if (reportData.length === 0 || members.length === 0) return;

    // Build headers: Date, then for each member: Name_M, Name_N, Name_E, then Daily Total
    const headers = ['Date'];
    members.forEach((member) => {
      headers.push(`${member.name}_Morning`, `${member.name}_Night`, `${member.name}_Eggs`);
    });
    headers.push('DailyTotal_Morning', 'DailyTotal_Night', 'DailyTotal_Eggs');

    // Build data rows
    const rows = dates.map((date) => {
      const dateData = dataMap.get(date);
      const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const row = [formattedDate];
      
      // Add member data
      let dailyMorning = 0;
      let dailyNight = 0;
      let dailyEggs = 0;
      
      members.forEach((member) => {
        const memberRow = dateData?.get(member.id);
        const morning = memberRow?.morning_count || 0;
        const night = memberRow?.night_count || 0;
        const eggs = memberRow?.egg_count || 0;
        
        row.push(String(morning), String(night), String(eggs));
        
        dailyMorning += morning;
        dailyNight += night;
        dailyEggs += eggs;
      });
      
      // Add daily totals
      row.push(String(dailyMorning), String(dailyNight), String(dailyEggs));
      
      return row;
    });

    // Add member totals row
    const totalsRow = ['Member Totals'];
    memberTotals.forEach((member) => {
      totalsRow.push(String(member.morning), String(member.night), String(member.eggs));
    });
    // Add grand totals to daily total columns
    totalsRow.push(String(grandTotals.morning), String(grandTotals.night), String(grandTotals.eggs));
    rows.push(totalsRow);

    // Add grand total row
    const grandTotalRow = ['Grand Total', `Total Meals: ${grandTotals.totalMeals}`, `Total Eggs: ${grandTotals.eggs}`];
    rows.push(grandTotalRow);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `global-meal-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [reportData, members, dates, dataMap, memberTotals, grandTotals, dateRange]);

  // PDF Export
  const handleExportPDF = useCallback(() => {
    if (reportData.length === 0 || members.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape' });

    // Add title
    doc.setFontSize(18);
    doc.text('Global Monthly Meal Report', 14, 20);

    // Add date range
    const displayRange = formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate);
    doc.setFontSize(12);
    doc.text(displayRange, 14, 28);

    // Prepare headers
    const headers = ['Date'];
    members.forEach((member) => {
      headers.push(`${member.name} M`, `${member.name} N`, `${member.name} E`);
    });
    headers.push('Daily M', 'Daily N', 'Daily E');

    // Prepare table data
    const tableData = dates.map((date) => {
      const dateData = dataMap.get(date);
      const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const row = [formattedDate];
      
      // Add member data and calculate daily totals
      let dailyMorning = 0;
      let dailyNight = 0;
      let dailyEggs = 0;
      
      members.forEach((member) => {
        const memberRow = dateData?.get(member.id);
        const morning = memberRow?.morning_count || 0;
        const night = memberRow?.night_count || 0;
        const eggs = memberRow?.egg_count || 0;
        
        row.push(String(morning), String(night), String(eggs));
        
        dailyMorning += morning;
        dailyNight += night;
        dailyEggs += eggs;
      });
      
      // Add daily totals
      row.push(String(dailyMorning), String(dailyNight), String(dailyEggs));
      
      return row;
    });

    // Add member totals row
    const totalsRow = ['Member Totals'];
    memberTotals.forEach((member) => {
      totalsRow.push(String(member.morning), String(member.night), String(member.eggs));
    });
    // Add grand totals to daily total columns
    totalsRow.push(String(grandTotals.morning), String(grandTotals.night), String(grandTotals.eggs));
    tableData.push(totalsRow);

    // Add grand total row
    const grandTotalRow = ['Grand Total'];
    grandTotalRow.push(`Meals: ${grandTotals.totalMeals}, Eggs: ${grandTotals.eggs}`);
    // Fill remaining columns
    for (let i = 1; i < members.length * 3 + 3; i++) {
      grandTotalRow.push('');
    }
    tableData.push(grandTotalRow);

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 35,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 7,
      },
      bodyStyles: {
        halign: 'center',
        fontSize: 7,
      },
      columnStyles: {
        0: { halign: 'left' },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      didParseCell: (data) => {
        // Style totals rows
        if (data.row.index === tableData.length - 2) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [229, 231, 235];
        }
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [219, 234, 254];
        }
      },
    });

    doc.save(`global-meal-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`);
  }, [reportData, members, dates, dataMap, memberTotals, grandTotals, dateRange]);

  // Toggle show/hide
  const handleToggleShow = () => {
    setShowReport(!showReport);
  };

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="p-4 bg-bg-secondary border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Global Monthly Report</h3>
          <p className="text-sm text-text-secondary">
            {formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate)}
          </p>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card overflow-hidden">
        <div className="p-4 bg-bg-secondary border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Global Monthly Report</h3>
          <p className="text-sm text-text-secondary">
            {formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate)}
          </p>
        </div>
        <div className="m-4 bg-error/10 border border-error text-error px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header with buttons */}
      <div className="p-4 bg-bg-secondary border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Global Monthly Report</h3>
            <p className="text-sm text-text-secondary">
              {formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              disabled={reportData.length === 0}
              className="btn-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              PDF
            </button>
            <button
              onClick={handleExportCSV}
              disabled={reportData.length === 0}
              className="btn-secondary px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              CSV
            </button>
            <button
              onClick={handleToggleShow}
              disabled={reportData.length === 0}
              className="btn-secondary px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
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

      {/* Empty state when no data */}
      {reportData.length === 0 && (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-text-secondary">No meal data available for this period</p>
        </div>
      )}

      {/* Collapsible Table */}
      {showReport && reportData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
            {/* Member Names Row */}
            <tr className="bg-bg-tertiary border-b border-border">
              <th
                rowSpan={2}
                className="px-4 py-3 text-left text-sm font-semibold text-text-primary sticky left-0 bg-bg-tertiary z-10 min-w-[120px]"
              >
                Date
              </th>
              {members.map((member) => (
                <th
                  key={member.id}
                  colSpan={3}
                  className="px-2 py-2 text-center text-sm font-semibold text-text-primary border-l border-border"
                >
                  {member.name}
                </th>
              ))}
              <th
                colSpan={3}
                className="px-2 py-2 text-center text-sm font-semibold text-text-primary border-l-2 border-border bg-primary/5"
              >
                Daily Total
              </th>
            </tr>
            {/* Sub-columns Row */}
            <tr className="bg-bg-tertiary border-b border-border">
              {members.map((member) => (
                <th key={member.id} className="contents">
                  <th className="px-2 py-2 text-center text-xs font-medium text-text-secondary border-l border-border min-w-[50px]">
                    M
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-text-secondary min-w-[50px]">
                    N
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-text-secondary min-w-[50px]">
                    E
                  </th>
                </th>
              ))}
              <th className="px-2 py-2 text-center text-xs font-medium text-text-secondary border-l-2 border-border min-w-[50px] bg-primary/5">
                M
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-text-secondary min-w-[50px] bg-primary/5">
                N
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-text-secondary min-w-[50px] bg-primary/5">
                E
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Data Rows by Date */}
            {dates.map((date) => {
              const dateData = dataMap.get(date);
              const hasAnyData = members.some((member) => {
                const row = dateData?.get(member.id);
                return (
                  row &&
                  (row.morning_count > 0 || row.night_count > 0 || row.egg_count > 0)
                );
              });

              // Calculate daily totals for this date
              const dailyTotal = members.reduce(
                (acc, member) => {
                  const row = dateData?.get(member.id);
                  return {
                    morning: acc.morning + (row?.morning_count || 0),
                    night: acc.night + (row?.night_count || 0),
                    eggs: acc.eggs + (row?.egg_count || 0),
                  };
                },
                { morning: 0, night: 0, eggs: 0 }
              );

              return (
                <tr
                  key={date}
                  className={`border-b border-border transition-colors ${
                    hasAnyData ? 'hover:bg-bg-secondary' : 'opacity-50'
                  }`}
                >
                  <td className="px-4 py-2 text-text-primary font-medium sticky left-0 bg-bg-primary z-10">
                    {formatDate(date)}
                  </td>
                  {members.map((member) => {
                    const row = dateData?.get(member.id);
                    return (
                      <td key={member.id} className="contents">
                        <td className="px-2 py-2 text-center text-sm text-text-secondary border-l border-border">
                          {renderCellValue(row?.morning_count || 0)}
                        </td>
                        <td className="px-2 py-2 text-center text-sm text-text-secondary">
                          {renderCellValue(row?.night_count || 0)}
                        </td>
                        <td className="px-2 py-2 text-center text-sm text-text-secondary">
                          {renderCellValue(row?.egg_count || 0)}
                        </td>
                      </td>
                    );
                  })}
                  {/* Daily Total Columns */}
                  <td className="px-2 py-2 text-center text-sm font-semibold text-text-primary border-l-2 border-border bg-primary/5">
                    {dailyTotal.morning > 0 ? dailyTotal.morning : '-'}
                  </td>
                  <td className="px-2 py-2 text-center text-sm font-semibold text-text-primary bg-primary/5">
                    {dailyTotal.night > 0 ? dailyTotal.night : '-'}
                  </td>
                  <td className="px-2 py-2 text-center text-sm font-semibold text-text-primary bg-primary/5">
                    {dailyTotal.eggs > 0 ? dailyTotal.eggs : '-'}
                  </td>
                </tr>
              );
            })}

            {/* Individual Member Totals */}
            <tr className="bg-bg-secondary border-b-2 border-border font-semibold">
              <td className="px-4 py-3 text-text-primary sticky left-0 bg-bg-secondary z-10">
                Member Totals
              </td>
              {memberTotals.map((member) => (
                <td key={member.member_id} className="contents">
                  <td className="px-2 py-3 text-center text-sm text-text-primary border-l border-border">
                    {member.morning}
                  </td>
                  <td className="px-2 py-3 text-center text-sm text-text-primary">
                    {member.night}
                  </td>
                  <td className="px-2 py-3 text-center text-sm text-text-primary">
                    {member.eggs}
                  </td>
                </td>
              ))}
              {/* Daily Total Column Totals (same as grand totals) */}
              <td className="px-2 py-3 text-center text-sm text-text-primary border-l-2 border-border bg-primary/10 font-bold">
                {grandTotals.morning}
              </td>
              <td className="px-2 py-3 text-center text-sm text-text-primary bg-primary/10 font-bold">
                {grandTotals.night}
              </td>
              <td className="px-2 py-3 text-center text-sm text-text-primary bg-primary/10 font-bold">
                {grandTotals.eggs}
              </td>
            </tr>

            {/* Grand Total Row */}
            <tr className="bg-primary/10 font-bold">
              <td className="px-4 py-3 text-text-primary sticky left-0 bg-primary/10 z-10">
                Grand Total
              </td>
              <td
                colSpan={members.length * 3 + 3}
                className="px-4 py-3 text-center text-text-primary border-l border-border"
              >
                <div className="flex justify-center gap-8">
                  <span>
                    Total Meals: <strong>{grandTotals.totalMeals}</strong>
                    <span className="text-sm text-text-secondary ml-2">
                      (M: {grandTotals.morning} + N: {grandTotals.night})
                    </span>
                  </span>
                  <span>
                    Total Eggs: <strong>{grandTotals.eggs}</strong>
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

export default GlobalMonthlyReport;
