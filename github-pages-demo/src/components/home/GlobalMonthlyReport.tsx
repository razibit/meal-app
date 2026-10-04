import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import type { GlobalReportRow, Member } from "../../types";
import {
  getMealMonthDateRange,
  formatDateRangeForDisplay,
} from "../../utils/mealMonthHelpers";
import { buildGlobalMealReport } from "../../utils/globalMealReport";
import {
  MEAL_PERIODS,
  MEAL_PERIOD_SHORT_LABELS,
} from "../../constants/meals";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function GlobalMonthlyReport({
  user,
  publicView = false,
}: {
  user: Member | null;
  publicView?: boolean;
}) {
  const [reportData, setReportData] = useState<GlobalReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(publicView);
  const [publicSummaryVisible, setPublicSummaryVisible] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const dateRange = useMemo(() => getMealMonthDateRange(user), [user]);
  const report = useMemo(() => buildGlobalMealReport(reportData), [reportData]);
  const isAdmin = user?.role === "admin";
  const canShowAggregates = isAdmin || (publicView && publicSummaryVisible);

  const fetchPublicSummaryVisibility = useCallback(async () => {
    if (!publicView && !isAdmin) return;

    if (publicView) {
      const { data, error: visibilityError } = await supabase.rpc(
        "get_public_report_visibility",
      );
      if (visibilityError) {
        console.error(visibilityError);
        setPublicSummaryVisible(false);
        return;
      }
      setPublicSummaryVisible(
        Boolean(data?.[0]?.show_monthly_totals_and_member_summary),
      );
      return;
    }

    const { data, error: visibilityError } = await supabase
      .from("public_report_settings")
      .select("show_monthly_totals_and_member_summary")
      .eq("id", true)
      .single();
    if (visibilityError) {
      console.error(visibilityError);
      return;
    }
    setPublicSummaryVisible(data.show_monthly_totals_and_member_summary);
  }, [isAdmin, publicView]);

  const updatePublicSummaryVisibility = async (visible: boolean) => {
    if (!isAdmin) return;
    setVisibilityLoading(true);
    const { error: visibilityError } = await supabase
      .from("public_report_settings")
      .update({ show_monthly_totals_and_member_summary: visible })
      .eq("id", true);
    setVisibilityLoading(false);
    if (visibilityError) {
      console.error(visibilityError);
      setError("Failed to update public report visibility. Please try again.");
      return;
    }
    setPublicSummaryVisible(visible);
  };

  const fetchReport = useCallback(async () => {
    if (!user && !publicView) return;
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc(
      publicView
        ? "get_public_global_meal_report"
        : "get_global_monthly_report_with_dates",
      { p_start_date: dateRange.startDate, p_end_date: dateRange.endDate },
    );
    if (rpcError) {
      console.error(rpcError);
      setError("Failed to load global monthly report. Please try again.");
    } else
      setReportData(
        publicView
          ? (
              (data || []) as Array<
                Omit<GlobalReportRow, "member_id"> & { member_key: string }
              >
            ).map((row) => ({ ...row, member_id: row.member_key }))
          : data || [],
      );
    setLoading(false);
  }, [dateRange, publicView, user]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);
  useEffect(() => {
    void fetchPublicSummaryVisibility();
  }, [fetchPublicSummaryVisibility]);
  useEffect(() => {
    if (publicView) {
      const timer = window.setInterval(() => void fetchReport(), 60_000);
      return () => window.clearInterval(timer);
    }
    const refresh = () => void fetchReport();
    window.addEventListener("meal:changed", refresh);
    window.addEventListener("ocr:changed", refresh);
    const channel = supabase
      .channel("global-meal-report")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meals" },
        refresh,
      )
      .subscribe();
    return () => {
      window.removeEventListener("meal:changed", refresh);
      window.removeEventListener("ocr:changed", refresh);
      void supabase.removeChannel(channel);
    };
  }, [fetchReport, publicView]);

  const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  const display = (value: number) => (value > 0 ? value : "-");

  const csvRows = useCallback(() => {
    const headers = ["Date"];
    report.members.forEach((member) =>
      headers.push(`${member.name}_B`, `${member.name}_L`, `${member.name}_D`),
    );
    headers.push("Daily_B", "Daily_L", "Daily_D", "Daily_Total");
    const rows = report.dates.map((date) => {
      const row = [formatDate(date)];
      report.members.forEach((member) => {
        const item = report.matrix.get(date)?.get(member.id);
        row.push(
          String(item?.breakfast_count || 0),
          String(item?.lunch_count || 0),
          String(item?.dinner_count || 0),
        );
      });
      const total = report.dailyTotals.get(date)!;
      row.push(
        String(total.breakfast),
        String(total.lunch),
        String(total.dinner),
        String(total.total),
      );
      return row;
    });
    const totals = ["Monthly Totals"];
    report.members.forEach((member) => {
      const total = report.memberTotals.get(member.id)!;
      totals.push(
        String(total.breakfast),
        String(total.lunch),
        String(total.dinner),
      );
    });
    totals.push(
      String(report.globalTotals.breakfast),
      String(report.globalTotals.lunch),
      String(report.globalTotals.dinner),
      String(report.globalTotals.total),
    );
    rows.push(totals);
    return { headers, rows };
  }, [report]);

  const exportCsv = () => {
    const { headers, rows } = csvRows();
    const url = URL.createObjectURL(
      new Blob(
        [[headers.join(","), ...rows.map((row) => row.join(","))].join("\n")],
        { type: "text/csv" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `global-meal-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportPdf = () => {
    const { headers, rows } = csvRows();
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text("Global Monthly Meal Report", 14, 20);
    doc.setFontSize(11);
    doc.text(
      formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate),
      14,
      28,
    );
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 35,
      theme: "striped",
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 7,
        halign: "center",
      },
      bodyStyles: { fontSize: 7, halign: "center" },
      columnStyles: { 0: { halign: "left" } },
    });
    doc.save(
      `global-meal-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`,
    );
  };

  return (
    <div className="card overflow-hidden">
      <div className="p-4 bg-bg-secondary border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              Global Monthly Report
            </h3>
            <p className="text-sm text-text-secondary">
              {formatDateRangeForDisplay(
                dateRange.startDate,
                dateRange.endDate,
              )}
            </p>
            {reportData.length > 0 && (
              <p className="text-sm text-text-secondary mt-1">
                Total Meals:{" "}
                <span className="font-medium text-text-primary">
                  {report.globalTotals.total}
                </span>
                <span className="text-text-tertiary">
                  {" "}
                  (B: {report.globalTotals.breakfast} + L:{" "}
                  {report.globalTotals.lunch} + D: {report.globalTotals.dinner})
                </span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportPdf}
              disabled={!reportData.length}
              className="btn-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50 text-sm"
            >
              PDF
            </button>
            <button
              onClick={exportCsv}
              disabled={!reportData.length}
              className="btn-secondary px-4 py-2 rounded-lg font-medium disabled:opacity-50 text-sm"
            >
              CSV
            </button>
            <button
              onClick={() => setShowReport((value) => !value)}
              disabled={!reportData.length}
              className="btn-secondary px-4 py-2 rounded-lg font-medium disabled:opacity-50 text-sm"
            >
              {showReport ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {isAdmin && (
          <label className="mt-4 flex items-center gap-3 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={publicSummaryVisible}
              disabled={visibilityLoading}
              onChange={(event) =>
                void updatePublicSummaryVisibility(event.target.checked)
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed"
            />
            <span>
              Show monthly totals and member monthly summary on the public link
            </span>
          </label>
        )}
      </div>
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      )}
      {error && !loading && (
        <div className="m-4 bg-error/10 border border-error text-error px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {!loading && !error && !reportData.length && (
        <div className="text-center py-12 text-text-secondary">
          No meal data available for this period
        </div>
      )}
      {showReport && !loading && reportData.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="bg-bg-tertiary border-b border-border">
                  <th
                    rowSpan={2}
                    className="px-4 py-3 text-left text-sm font-semibold text-text-primary sticky left-0 bg-bg-tertiary z-10 min-w-[120px]"
                  >
                    Date
                  </th>
                  {report.members.map((member) => (
                    <th
                      key={member.id}
                      colSpan={3}
                      className="px-2 py-2 text-center text-sm font-semibold text-text-primary border-l border-border"
                    >
                      {member.name}
                    </th>
                  ))}
                  <th
                    colSpan={4}
                    className="px-2 py-2 text-center text-sm font-semibold text-text-primary border-l-2 border-border bg-primary/5"
                  >
                    Daily Total
                  </th>
                </tr>
                <tr className="bg-bg-tertiary border-b border-border">
                  {report.members.map((member) => (
                    <Fragment key={member.id}>
                      {MEAL_PERIODS.map((period) => (
                        <th
                          key={period}
                          className="px-2 py-2 text-center text-xs font-medium text-text-secondary border-l border-border min-w-[50px]"
                        >
                          {MEAL_PERIOD_SHORT_LABELS[period]}
                        </th>
                      ))}
                    </Fragment>
                  ))}
                  {MEAL_PERIODS.map((period) => (
                    <th
                      key={period}
                      className="px-2 py-2 text-center text-xs font-medium text-text-secondary border-l border-border min-w-[50px] bg-primary/5"
                    >
                      {MEAL_PERIOD_SHORT_LABELS[period]}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center text-xs font-medium text-text-secondary min-w-[60px] bg-primary/5">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.dates.map((date) => {
                  const total = report.dailyTotals.get(date)!;
                  return (
                    <tr
                      key={date}
                      className="border-b border-border hover:bg-bg-secondary transition-colors"
                    >
                      <td className="px-4 py-2 text-text-primary font-medium sticky left-0 bg-bg-primary z-10">
                        {formatDate(date)}
                      </td>
                      {report.members.map((member) => {
                        const row = report.matrix.get(date)?.get(member.id);
                        return (
                          <Fragment key={member.id}>
                            <td className="px-2 py-2 text-center text-sm text-text-secondary border-l border-border">
                              {display(row?.breakfast_count || 0)}
                            </td>
                            <td className="px-2 py-2 text-center text-sm text-text-secondary">
                              {display(row?.lunch_count || 0)}
                            </td>
                            <td className="px-2 py-2 text-center text-sm text-text-secondary">
                              {display(row?.dinner_count || 0)}
                            </td>
                          </Fragment>
                        );
                      })}
                      <td className="px-2 py-2 text-center text-sm font-semibold border-l-2 border-border bg-primary/5">
                        {display(total.breakfast)}
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold bg-primary/5">
                        {display(total.lunch)}
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold bg-primary/5">
                        {display(total.dinner)}
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-bold bg-primary/10">
                        {display(total.total)}
                      </td>
                    </tr>
                  );
                })}
                {canShowAggregates && (
                <tr className="bg-bg-secondary border-t-2 border-border font-semibold">
                  <td className="px-4 py-3 text-text-primary sticky left-0 bg-bg-secondary z-10">
                    Monthly Totals
                  </td>
                  {report.members.map((member) => {
                    const total = report.memberTotals.get(member.id)!;
                    return (
                      <Fragment key={member.id}>
                        <td className="px-2 py-3 text-center border-l border-border">
                          {total.breakfast}
                        </td>
                        <td className="px-2 py-3 text-center">{total.lunch}</td>
                        <td className="px-2 py-3 text-center">
                          {total.dinner}
                        </td>
                      </Fragment>
                    );
                  })}
                  <td className="px-2 py-3 text-center border-l-2 border-border bg-primary/10">
                    {report.globalTotals.breakfast}
                  </td>
                  <td className="px-2 py-3 text-center bg-primary/10">
                    {report.globalTotals.lunch}
                  </td>
                  <td className="px-2 py-3 text-center bg-primary/10">
                    {report.globalTotals.dinner}
                  </td>
                  <td className="px-2 py-3 text-center bg-primary/15 font-bold">
                    {report.globalTotals.total}
                  </td>
                </tr>
                )}
              </tbody>
            </table>
          </div>
          {canShowAggregates && (
          <div className="border-t border-border bg-bg-secondary p-4">
            <h4 className="text-sm font-semibold text-text-primary mb-3">
              Member Monthly Summary
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="text-text-secondary">
                    <th className="px-3 py-2 text-left">Member</th>
                    <th className="px-3 py-2 text-center">Breakfast</th>
                    <th className="px-3 py-2 text-center">Lunch</th>
                    <th className="px-3 py-2 text-center">Dinner</th>
                    <th className="px-3 py-2 text-center">Total Meals</th>
                  </tr>
                </thead>
                <tbody>
                  {report.members.map((member) => {
                    const total = report.memberTotals.get(member.id)!;
                    return (
                      <tr key={member.id} className="border-t border-border">
                        <td className="px-3 py-2 font-medium">{member.name}</td>
                        <td className="px-3 py-2 text-center">
                          {total.breakfast}
                        </td>
                        <td className="px-3 py-2 text-center">{total.lunch}</td>
                        <td className="px-3 py-2 text-center">
                          {total.dinner}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold">
                          {total.total}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-border font-bold">
                    <td className="px-3 py-2">Dormitory Total</td>
                    <td className="px-3 py-2 text-center">
                      {report.globalTotals.breakfast}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {report.globalTotals.lunch}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {report.globalTotals.dinner}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {report.globalTotals.total}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
}
export default GlobalMonthlyReport;
