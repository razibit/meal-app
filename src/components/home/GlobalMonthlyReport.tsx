import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import { GlobalReportRow, Member, MemberTotals } from '../../types';
import { getMealMonthDateRange, formatDateRangeForDisplay } from '../../utils/mealMonthHelpers';
import { MEAL_PERIODS, MEAL_PERIOD_SHORT_LABELS } from '../../constants/meals';
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
  const dateRange = useMemo(() => getMealMonthDateRange(user), [user]);

  const fetchGlobalReport = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_global_monthly_report_with_dates', {
        p_start_date: dateRange.startDate,
        p_end_date: dateRange.endDate,
      });

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

  const members = useMemo(() => {
    const memberMap = new Map<string, { id: string; name: string }>();
    reportData.forEach((row) => memberMap.set(row.member_id, { id: row.member_id, name: row.member_name }));
    return Array.from(memberMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [reportData]);

  const dates = useMemo(() => Array.from(new Set(reportData.map((row) => row.meal_date))).sort(), [reportData]);

  const dataMap = useMemo(() => {
    const map = new Map<string, Map<string, GlobalReportRow>>();
    reportData.forEach((row) => {
      if (!map.has(row.meal_date)) map.set(row.meal_date, new Map());
      map.get(row.meal_date)!.set(row.member_id, row);
    });
    return map;
  }, [reportData]);

  const memberTotals = useMemo<MemberTotals[]>(() => {
    return members.map((member) => {
      const rows = reportData.filter((row) => row.member_id === member.id);
      return {
        member_id: member.id,
        member_name: member.name,
        breakfast: rows.reduce((sum, row) => sum + row.breakfast_count, 0),
        lunch: rows.reduce((sum, row) => sum + row.lunch_count, 0),
        dinner: rows.reduce((sum, row) => sum + row.dinner_count, 0),
        eggs: rows.reduce((sum, row) => sum + row.egg_count, 0),
      };
    });
  }, [reportData, members]);

  const grandTotals = useMemo(() => {
    return memberTotals.reduce(
      (acc, member) => ({
        breakfast: acc.breakfast + member.breakfast,
        lunch: acc.lunch + member.lunch,
        dinner: acc.dinner + member.dinner,
        eggs: acc.eggs + member.eggs,
        totalMeals: acc.totalMeals + member.breakfast + member.lunch + member.dinner,
      }),
      { breakfast: 0, lunch: 0, dinner: 0, eggs: 0, totalMeals: 0 }
    );
  }, [memberTotals]);

  const formatDate = (dateStr: string) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const renderCellValue = (value: number) => value > 0 ? value : '-';

  const handleExportCSV = useCallback(() => {
    if (reportData.length === 0 || members.length === 0) return;

    const headers = ['Date'];
    members.forEach((member) => headers.push(`${member.name}_B`, `${member.name}_L`, `${member.name}_D`, `${member.name}_E`));
    headers.push('Daily_B', 'Daily_L', 'Daily_D', 'Daily_E');

    const rows = dates.map((date) => {
      const dateData = dataMap.get(date);
      const row = [new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })];
      const daily = { breakfast: 0, lunch: 0, dinner: 0, eggs: 0 };

      members.forEach((member) => {
        const item = dateData?.get(member.id);
        row.push(
          String(item?.breakfast_count || 0),
          String(item?.lunch_count || 0),
          String(item?.dinner_count || 0),
          String(item?.egg_count || 0)
        );
        daily.breakfast += item?.breakfast_count || 0;
        daily.lunch += item?.lunch_count || 0;
        daily.dinner += item?.dinner_count || 0;
        daily.eggs += item?.egg_count || 0;
      });

      row.push(String(daily.breakfast), String(daily.lunch), String(daily.dinner), String(daily.eggs));
      return row;
    });

    const totalsRow = ['Member Totals'];
    memberTotals.forEach((member) => totalsRow.push(String(member.breakfast), String(member.lunch), String(member.dinner), String(member.eggs)));
    totalsRow.push(String(grandTotals.breakfast), String(grandTotals.lunch), String(grandTotals.dinner), String(grandTotals.eggs));
    rows.push(totalsRow);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `global-meal-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [reportData, members, dates, dataMap, memberTotals, grandTotals, dateRange]);

  const handleExportPDF = useCallback(() => {
    if (reportData.length === 0 || members.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18);
    doc.text('Global Monthly Meal Report', 14, 20);
    doc.setFontSize(12);
    doc.text(formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate), 14, 28);

    const headers = ['Date'];
    members.forEach((member) => headers.push(`${member.name} B`, `${member.name} L`, `${member.name} D`, `${member.name} E`));
    headers.push('Daily B', 'Daily L', 'Daily D', 'Daily E');

    const tableData = dates.map((date) => {
      const dateData = dataMap.get(date);
      const row = [formatDate(date)];
      const daily = { breakfast: 0, lunch: 0, dinner: 0, eggs: 0 };

      members.forEach((member) => {
        const item = dateData?.get(member.id);
        row.push(
          String(item?.breakfast_count || 0),
          String(item?.lunch_count || 0),
          String(item?.dinner_count || 0),
          String(item?.egg_count || 0)
        );
        daily.breakfast += item?.breakfast_count || 0;
        daily.lunch += item?.lunch_count || 0;
        daily.dinner += item?.dinner_count || 0;
        daily.eggs += item?.egg_count || 0;
      });

      row.push(String(daily.breakfast), String(daily.lunch), String(daily.dinner), String(daily.eggs));
      return row;
    });

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 35,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 7 },
      bodyStyles: { halign: 'center', fontSize: 7 },
      columnStyles: { 0: { halign: 'left' } },
    });

    doc.save(`global-meal-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`);
  }, [reportData, members, dates, dataMap, dateRange]);

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="p-4 bg-bg-secondary border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Global Monthly Report</h3>
          <p className="text-sm text-text-secondary">{formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate)}</p>
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
          <p className="text-sm text-text-secondary">{formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate)}</p>
        </div>
        <div className="m-4 bg-error/10 border border-error text-error px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 bg-bg-secondary border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Global Monthly Report</h3>
            <p className="text-sm text-text-secondary">{formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate)}</p>
            {reportData.length > 0 && (
              <p className="text-sm text-text-secondary mt-1">
                Total Meals: <span className="font-medium text-text-primary">{grandTotals.totalMeals}</span>
                <span className="text-text-tertiary"> (B: {grandTotals.breakfast} + L: {grandTotals.lunch} + D: {grandTotals.dinner})</span>
                {' | '}
                Total Eggs: <span className="font-medium text-text-primary">{grandTotals.eggs}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportPDF} disabled={reportData.length === 0} className="btn-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50 text-sm">PDF</button>
            <button onClick={handleExportCSV} disabled={reportData.length === 0} className="btn-secondary px-4 py-2 rounded-lg font-medium disabled:opacity-50 text-sm">CSV</button>
            <button onClick={() => setShowReport(!showReport)} disabled={reportData.length === 0} className="btn-secondary px-4 py-2 rounded-lg font-medium disabled:opacity-50 text-sm">
              {showReport ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      </div>

      {reportData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary">No meal data available for this period</p>
        </div>
      )}

      {showReport && reportData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="bg-bg-tertiary border-b border-border">
                <th rowSpan={2} className="px-4 py-3 text-left text-sm font-semibold text-text-primary sticky left-0 bg-bg-tertiary z-10 min-w-[120px]">Date</th>
                {members.map((member) => (
                  <th key={member.id} colSpan={4} className="px-2 py-2 text-center text-sm font-semibold text-text-primary border-l border-border">
                    {member.name}
                  </th>
                ))}
                <th colSpan={4} className="px-2 py-2 text-center text-sm font-semibold text-text-primary border-l-2 border-border bg-primary/5">Daily Total</th>
              </tr>
              <tr className="bg-bg-tertiary border-b border-border">
                {members.map((member) => (
                  <th key={member.id} className="contents">
                    {MEAL_PERIODS.map((period) => (
                      <th key={period} className="px-2 py-2 text-center text-xs font-medium text-text-secondary border-l border-border min-w-[50px]">
                        {MEAL_PERIOD_SHORT_LABELS[period]}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center text-xs font-medium text-text-secondary min-w-[50px]">E</th>
                  </th>
                ))}
                {MEAL_PERIODS.map((period) => (
                  <th key={period} className="px-2 py-2 text-center text-xs font-medium text-text-secondary border-l border-border min-w-[50px] bg-primary/5">
                    {MEAL_PERIOD_SHORT_LABELS[period]}
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-xs font-medium text-text-secondary min-w-[50px] bg-primary/5">E</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => {
                const dateData = dataMap.get(date);
                const daily = { breakfast: 0, lunch: 0, dinner: 0, eggs: 0 };

                return (
                  <tr key={date} className="border-b border-border hover:bg-bg-secondary transition-colors">
                    <td className="px-4 py-2 text-text-primary font-medium sticky left-0 bg-bg-primary z-10">{formatDate(date)}</td>
                    {members.map((member) => {
                      const row = dateData?.get(member.id);
                      daily.breakfast += row?.breakfast_count || 0;
                      daily.lunch += row?.lunch_count || 0;
                      daily.dinner += row?.dinner_count || 0;
                      daily.eggs += row?.egg_count || 0;
                      return (
                        <td key={member.id} className="contents">
                          <td className="px-2 py-2 text-center text-sm text-text-secondary border-l border-border">{renderCellValue(row?.breakfast_count || 0)}</td>
                          <td className="px-2 py-2 text-center text-sm text-text-secondary border-l border-border">{renderCellValue(row?.lunch_count || 0)}</td>
                          <td className="px-2 py-2 text-center text-sm text-text-secondary border-l border-border">{renderCellValue(row?.dinner_count || 0)}</td>
                          <td className="px-2 py-2 text-center text-sm text-text-secondary">{renderCellValue(row?.egg_count || 0)}</td>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center text-sm font-semibold text-text-primary border-l-2 border-border bg-primary/5">{renderCellValue(daily.breakfast)}</td>
                    <td className="px-2 py-2 text-center text-sm font-semibold text-text-primary bg-primary/5">{renderCellValue(daily.lunch)}</td>
                    <td className="px-2 py-2 text-center text-sm font-semibold text-text-primary bg-primary/5">{renderCellValue(daily.dinner)}</td>
                    <td className="px-2 py-2 text-center text-sm font-semibold text-text-primary bg-primary/5">{renderCellValue(daily.eggs)}</td>
                  </tr>
                );
              })}

              <tr className="bg-bg-secondary border-b-2 border-border font-semibold">
                <td className="px-4 py-3 text-text-primary sticky left-0 bg-bg-secondary z-10">Member Totals</td>
                {memberTotals.map((member) => (
                  <td key={member.member_id} className="contents">
                    <td className="px-2 py-3 text-center text-sm text-text-primary border-l border-border">{member.breakfast}</td>
                    <td className="px-2 py-3 text-center text-sm text-text-primary">{member.lunch}</td>
                    <td className="px-2 py-3 text-center text-sm text-text-primary">{member.dinner}</td>
                    <td className="px-2 py-3 text-center text-sm text-text-primary">{member.eggs}</td>
                  </td>
                ))}
                <td className="px-2 py-3 text-center text-sm text-text-primary border-l-2 border-border bg-primary/10 font-bold">{grandTotals.breakfast}</td>
                <td className="px-2 py-3 text-center text-sm text-text-primary bg-primary/10 font-bold">{grandTotals.lunch}</td>
                <td className="px-2 py-3 text-center text-sm text-text-primary bg-primary/10 font-bold">{grandTotals.dinner}</td>
                <td className="px-2 py-3 text-center text-sm text-text-primary bg-primary/10 font-bold">{grandTotals.eggs}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default GlobalMonthlyReport;
