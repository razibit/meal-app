import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { GlobalReportRow, MemberTotals, Member } from '../../types';
import { getMealMonthDateRange, formatDateRangeForDisplay } from '../../utils/mealMonthHelpers';

interface GlobalMonthlyReportProps {
  user: Member | null;
}

function GlobalMonthlyReport({ user }: GlobalMonthlyReportProps) {
  const [reportData, setReportData] = useState<GlobalReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 bg-error/10 border border-error text-error px-4 py-3 rounded-lg animate-slide-down">
        {error}
      </div>
    );
  }

  if (reportData.length === 0) {
    return (
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
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="mb-4 p-4 bg-bg-secondary border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary">Global Monthly Report</h3>
        <p className="text-sm text-text-secondary">
          {formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate)}
        </p>
      </div>

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
            </tr>

            {/* Grand Total Row */}
            <tr className="bg-primary/10 font-bold">
              <td className="px-4 py-3 text-text-primary sticky left-0 bg-primary/10 z-10">
                Grand Total
              </td>
              <td
                colSpan={members.length * 3}
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
    </div>
  );
}

export default GlobalMonthlyReport;
