import jsPDF from 'jspdf';
import autoTable, { type CellInput, type RowInput } from 'jspdf-autotable';
import { supabase } from '../services/supabase';
import type { DepositReportRow, GlobalReportRow, GroceryExpenseReportRow } from '../types';
import { buildGlobalMealReport } from './globalMealReport';
import { formatDateRangeForDisplay } from './mealMonthHelpers';

const BLUE: [number, number, number] = [37, 99, 235];
const LIGHT_BLUE: [number, number, number] = [239, 246, 255];
const LIGHT_GRAY: [number, number, number] = [248, 250, 252];
const TEXT: [number, number, number] = [15, 23, 42];
const MARGIN = 12;

const money = (value: number) => `BDT ${Number(value).toFixed(2)}`;
const dateOnly = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric',
});
const dateTime = (value: string) => new Date(value).toLocaleString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

function sectionTitle(doc: jsPDF, title: string, period: string) {
  doc.setTextColor(...TEXT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, MARGIN, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(period, MARGIN, 23);
}

function addSectionPage(doc: jsPDF, title: string, period: string) {
  doc.addPage('a4', 'landscape');
  sectionTitle(doc, title, period);
}

const tableDefaults = {
  theme: 'grid' as const,
  margin: { left: MARGIN, right: MARGIN, top: 14, bottom: 14 },
  styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' as const, textColor: TEXT, lineColor: [203, 213, 225] as [number, number, number], lineWidth: 0.15 },
  headStyles: { fillColor: BLUE, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const, halign: 'center' as const, valign: 'middle' as const },
  alternateRowStyles: { fillColor: LIGHT_GRAY },
  showHead: 'everyPage' as const,
  rowPageBreak: 'avoid' as const,
};

export async function exportReportsPdf(startDate: string, endDate: string) {
  const [globalResult, depositResult, expenseResult] = await Promise.all([
    supabase.rpc('get_global_monthly_report_with_dates', { p_start_date: startDate, p_end_date: endDate }),
    supabase.rpc('get_monthly_deposit_report_with_dates', { p_start_date: startDate, p_end_date: endDate }),
    supabase.rpc('get_grocery_expense_report_with_dates', { p_start_date: startDate, p_end_date: endDate }),
  ]);
  const failed = [globalResult, depositResult, expenseResult].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const globalRows = (globalResult.data || []) as GlobalReportRow[];
  const depositRows = (depositResult.data || []) as DepositReportRow[];
  const expenseRows = (expenseResult.data || []) as GroceryExpenseReportRow[];
  const report = buildGlobalMealReport(globalRows);
  const period = formatDateRangeForDisplay(startDate, endDate);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  sectionTitle(doc, 'Global Monthly Report', period);
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(`Total weighted meals: ${report.globalTotals.total}`, MARGIN, 29);

  const memberGroups = Array.from({ length: Math.ceil(report.members.length / 5) }, (_, index) =>
    report.members.slice(index * 5, index * 5 + 5),
  );
  memberGroups.forEach((members, groupIndex) => {
    if (groupIndex > 0) {
      addSectionPage(doc, `Global Monthly Report - Members ${groupIndex * 5 + 1}-${groupIndex * 5 + members.length}`, period);
      doc.setFontSize(9);
      doc.setTextColor(...TEXT);
      doc.text(`Total weighted meals: ${report.globalTotals.total}`, MARGIN, 29);
    }
    const globalHead: CellInput[] = ['Date'];
    members.forEach((member) => globalHead.push(`${member.name} B`, `${member.name} L`, `${member.name} D`));
    globalHead.push('Daily B', 'Daily L', 'Daily D', 'Daily Total');
    const globalBody: RowInput[] = report.dates.map((date) => {
      const row: CellInput[] = [dateOnly(date)];
      members.forEach((member) => {
        const item = report.matrix.get(date)?.get(member.id);
        row.push(item?.breakfast_count || '-', item?.lunch_count || '-', item?.dinner_count || '-');
      });
      const total = report.dailyTotals.get(date)!;
      row.push(total.breakfast || '-', total.lunch || '-', total.dinner || '-', total.total || '-');
      return row;
    });
    const monthlyTotals: CellInput[] = ['Monthly Totals'];
    members.forEach((member) => {
      const total = report.memberTotals.get(member.id)!;
      monthlyTotals.push(total.breakfast, total.lunch, total.dinner);
    });
    monthlyTotals.push(report.globalTotals.breakfast, report.globalTotals.lunch, report.globalTotals.dinner, report.globalTotals.total);
    globalBody.push(monthlyTotals);
    autoTable(doc, {
      ...tableDefaults,
      startY: 33,
      head: [globalHead],
      body: globalBody,
      tableWidth: 'auto',
      styles: { ...tableDefaults.styles, fontSize: 6.2, cellPadding: 0.8, minCellHeight: 4.4, halign: 'center' },
      columnStyles: { 0: { cellWidth: 27, halign: 'left', fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === globalBody.length - 1) {
          data.cell.styles.fillColor = LIGHT_BLUE;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
  });

  addSectionPage(doc, 'Global Monthly Report - Member Summary', period);
  const summaryBody: RowInput[] = report.members.map((member) => {
    const total = report.memberTotals.get(member.id)!;
    return [member.name, total.breakfast, total.lunch, total.dinner, total.total];
  });
  summaryBody.push(['Dormitory Total', report.globalTotals.breakfast, report.globalTotals.lunch, report.globalTotals.dinner, report.globalTotals.total]);
  autoTable(doc, {
    ...tableDefaults,
    startY: 29,
    head: [['Member', 'Breakfast', 'Lunch', 'Dinner', 'Total Meals']],
    body: summaryBody,
    columnStyles: { 0: { cellWidth: 80, halign: 'left' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center', fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === summaryBody.length - 1) {
        data.cell.styles.fillColor = LIGHT_BLUE;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  addSectionPage(doc, 'Deposit Report', period);
  const depositTotal = depositRows.reduce((sum, row) => sum + Number(row.amount), 0);
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(`Grand total: ${money(depositTotal)}`, MARGIN, 29);
  const sortedDeposits = [...depositRows].sort((a, b) => a.depositor_name.localeCompare(b.depositor_name) || new Date(b.deposit_date).getTime() - new Date(a.deposit_date).getTime());
  const depositBody: RowInput[] = sortedDeposits.map((row) => [row.depositor_name, dateTime(row.deposit_date), row.added_by_name, row.details || '-', money(row.amount)]);
  depositBody.push(['Grand Total', '', '', '', money(depositTotal)]);
  autoTable(doc, {
    ...tableDefaults,
    startY: 33,
    head: [['Depositor', 'Date', 'Added By', 'Details', 'Amount']],
    body: depositBody,
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 45 }, 2: { cellWidth: 42 }, 3: { cellWidth: 100 }, 4: { cellWidth: 32, halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === depositBody.length - 1) {
        data.cell.styles.fillColor = LIGHT_BLUE;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  addSectionPage(doc, 'Grocery Expense Report', period);
  const cashTotal = expenseRows.filter((row) => row.transaction_type === 'cash').reduce((sum, row) => sum + Number(row.amount), 0);
  const creditTotal = expenseRows.filter((row) => row.transaction_type === 'credit').reduce((sum, row) => sum + Number(row.amount), 0);
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(`Cash: ${money(cashTotal)}   Credit: ${money(creditTotal)}   Grand total: ${money(cashTotal + creditTotal)}`, MARGIN, 29);
  const expenseBody: RowInput[] = [...expenseRows]
    .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
    .map((row) => [dateTime(row.expense_date), row.added_by_name, row.shopper_name, row.transaction_type.toUpperCase(), row.details || '-', money(row.amount)]);
  expenseBody.push(['Grand Total', '', '', '', '', money(cashTotal + creditTotal)]);
  autoTable(doc, {
    ...tableDefaults,
    startY: 33,
    head: [['Date', 'Added By', 'Shopper', 'Type', 'Details', 'Amount']],
    body: expenseBody,
    columnStyles: { 0: { cellWidth: 43 }, 1: { cellWidth: 37 }, 2: { cellWidth: 37, fontStyle: 'bold' }, 3: { cellWidth: 24, halign: 'center' }, 4: { cellWidth: 102 }, 5: { cellWidth: 30, halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === expenseBody.length - 1) {
        data.cell.styles.fillColor = LIGHT_BLUE;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(203, 213, 225);
    doc.line(MARGIN, 198, 285, 198);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated ${new Date().toLocaleString('en-US')}`, MARGIN, 203);
    doc.text(`Page ${page} of ${pageCount}`, 285, 203, { align: 'right' });
  }

  doc.save(`reports-${startDate}-to-${endDate}.pdf`);
}
